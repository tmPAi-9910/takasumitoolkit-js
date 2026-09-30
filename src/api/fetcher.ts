import type { z } from "zod";
import {
  TakasumiBotKitNetworkError,
  TakasumiBotKitResponseParseError,
  TakasumiBotKitTimeoutError,
} from "../errors";
import { parseJsonWithBigInt } from "../internal/json";
import type { RequiredLogger } from "../internal/logger";
import { joinUrl, stripTrailingSlash } from "../internal/url";
import { withRetry } from "../retry";
import type { RetryConfig } from "../retry";
import type { FetchLike } from "../client/types";
import { createHttpError, snapshotHeaders } from "./httpError";

/** Everything the transport layer needs to perform a request. */
export interface RequestContext {
  /** Resolved base URL (no trailing slash). */
  readonly baseUrl: string;
  /** Per attempt timeout in ms. */
  readonly timeoutMs: number;
  /** Headers merged into every request (user headers win). */
  readonly headers: Readonly<Record<string, string>>;
  /** `fetch` implementation. */
  readonly fetchImpl: FetchLike;
  /** Logger used by the retry loop. */
  readonly logger: RequiredLogger;
  /** Retry configuration. */
  readonly retry: RetryConfig;
  /** Injectable sleep (tests). */
  readonly sleepFn?: (ms: number) => Promise<void>;
  /** Injectable random source (tests). */
  readonly random?: () => number;
}

/** Description of one request. */
export interface RequestOptions<T> {
  /** HTTP method. The OpenAPI document only declares `GET` endpoints. */
  readonly method: "GET";
  /** Request path, e.g. `/v3/tax/`. Trailing slashes are removed. */
  readonly path: string;
  /** `zod` schema validating the parsed body of a 2xx response. */
  readonly schema: z.ZodType<T, z.ZodTypeDef, unknown>;
}

/** Headers sent by default; user supplied headers override them. */
const DEFAULT_HEADERS: Readonly<Record<string, string>> = {
  accept: "application/json",
};

/** Returns `true` for 2xx status codes. */
function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

/** Best effort detection of an `AbortError`. */
function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

/** Reads the response body as text, returning `undefined` when it fails. */
async function readTextBody(response: Response): Promise<string> {
  return response.text();
}

/** Parses a body without ever throwing (used for error responses). */
function tryParse(text: string | undefined): unknown {
  if (text === undefined || text.length === 0) {
    return undefined;
  }
  try {
    return parseJsonWithBigInt(text);
  } catch {
    return undefined;
  }
}

/**
 * Performs a single HTTP attempt (no retry).
 *
 * @param context - Resolved client configuration.
 * @param options - Method, path and response schema.
 * @returns The validated response body.
 * @throws {TakasumiBotKitTimeoutError} When the attempt exceeds `timeoutMs`.
 * @throws {TakasumiBotKitNetworkError} When `fetch` rejects or the body cannot
 *   be read.
 * @throws {TakasumiBotKitHttpError} When the status is not 2xx.
 * @throws {TakasumiBotKitResponseParseError} When a 2xx body is invalid JSON or
 *   fails `zod` validation.
 */
async function performRequest<T>(
  context: RequestContext,
  options: RequestOptions<T>,
  url: string,
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, context.timeoutMs);
  // Never keep the event loop alive just for the timeout.
  timer.unref?.();

  let response: Response;
  try {
    response = await context.fetchImpl(url, {
      method: options.method,
      headers: { ...DEFAULT_HEADERS, ...context.headers },
      signal: controller.signal,
    });
  } catch (error) {
    if (timedOut || isAbortError(error)) {
      throw new TakasumiBotKitTimeoutError(
        { timeoutMs: context.timeoutMs, url, method: options.method },
        { cause: error },
      );
    }
    throw new TakasumiBotKitNetworkError(
      `Network error for ${options.method} ${url}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { url, method: options.method },
      { cause: error },
    );
  } finally {
    clearTimeout(timer);
  }

  const headers = snapshotHeaders(response.headers);
  let rawBody: string | undefined;
  let bodyError: unknown;
  try {
    rawBody = await readTextBody(response);
  } catch (error) {
    bodyError = error;
  }

  if (!isSuccessStatus(response.status)) {
    throw createHttpError({
      status: response.status,
      statusText: response.statusText,
      url,
      method: options.method,
      headers,
      rawBody,
      parsedBody: tryParse(rawBody),
      cause: bodyError,
    });
  }

  if (bodyError !== undefined) {
    throw new TakasumiBotKitNetworkError(
      `Failed to read the response body of ${options.method} ${url}: ${
        bodyError instanceof Error ? bodyError.message : String(bodyError)
      }`,
      { url, method: options.method },
      { cause: bodyError },
    );
  }

  const rawText = rawBody ?? "";
  let parsed: unknown;
  try {
    parsed = parseJsonWithBigInt(rawText);
  } catch (error) {
    throw new TakasumiBotKitResponseParseError(
      `Failed to parse the JSON response of ${options.method} ${url}`,
      { url, method: options.method, status: response.status, rawBody: rawText },
      { cause: error },
    );
  }

  const validated = options.schema.safeParse(parsed);
  if (!validated.success) {
    throw new TakasumiBotKitResponseParseError(
      `Response of ${options.method} ${url} does not match the expected schema`,
      {
        url,
        method: options.method,
        status: response.status,
        rawBody: rawText,
        zodIssues: validated.error.issues,
      },
      { cause: validated.error },
    );
  }

  context.logger.debug(`Received ${response.status} from ${options.method} ${url}`, {
    url,
    method: options.method,
    status: response.status,
  });
  return validated.data;
}

/**
 * Performs a validated HTTP request against the TakasumiBOT API, retrying
 * transient failures.
 *
 * The URL is `baseUrl` + `path`, both with their trailing slashes removed
 * (e.g. `https://api.takasumibot.com` + `/v3/tax/` →
 * `https://api.takasumibot.com/v3/tax`).
 *
 * @param context - Resolved client configuration.
 * @param options - Method, path and response schema.
 * @returns The parsed and `zod`-validated response body.
 * @throws {TakasumiBotKitNetworkError} When the network fails.
 * @throws {TakasumiBotKitTimeoutError} When the request times out.
 * @throws {TakasumiBotKitHttpError} When the status is not 2xx.
 * @throws {TakasumiBotKitResponseParseError} When a 2xx body is invalid.
 * @throws {TakasumiBotKitRetryLimitError} When retries are exhausted.
 *
 * @example
 * ```ts
 * const tax = await request(context, { method: "GET", path: "/v3/tax/", schema: taxResponseSchema });
 * ```
 */
export async function request<T>(context: RequestContext, options: RequestOptions<T>): Promise<T> {
  const url = joinUrl(stripTrailingSlash(context.baseUrl), options.path);
  return withRetry(() => performRequest(context, options, url), context.retry, {
    url,
    method: options.method,
    logger: context.logger,
    sleepFn: context.sleepFn,
    random: context.random,
  });
}
