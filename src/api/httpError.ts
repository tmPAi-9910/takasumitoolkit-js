import { TakasumiBotKitHttpError } from "../errors";

/** Headers kept on {@link TakasumiBotKitHttpError} (docs/ERRORS.md: "必要なもののみ"). */
const CAPTURED_HEADERS = [
  "retry-after",
  "content-type",
  "x-request-id",
  "x-requestid",
  "request-id",
  "x-takasumibot-request-id",
  "x-ratelimit-remaining",
] as const;

/** Response headers searched for a request id, in order. */
const REQUEST_ID_HEADERS = [
  "x-request-id",
  "x-requestid",
  "request-id",
  "x-takasumibot-request-id",
] as const;

/** Body keys searched for an error code, in order. */
const CODE_KEYS = ["code", "errorCode", "error_code"] as const;

/** Body keys searched for a request id, in order. */
const REQUEST_ID_KEYS = ["requestId", "request_id", "id"] as const;

/** Minimal structural view of a `Headers`-like object. */
interface HeadersLike {
  get?: (name: string) => string | null;
}

/**
 * Copies the few response headers the SDK exposes on
 * {@link TakasumiBotKitHttpError}.
 *
 * @param headers - Response headers (anything with a `get` method).
 * @returns A lower-cased header map (empty when headers are unavailable).
 */
export function snapshotHeaders(headers: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (typeof headers !== "object" || headers === null) {
    return result;
  }
  const get = (headers as HeadersLike).get;
  if (typeof get !== "function") {
    return result;
  }
  for (const name of CAPTURED_HEADERS) {
    let value: string | null = null;
    try {
      value = get.call(headers, name);
    } catch {
      value = null;
    }
    if (typeof value === "string" && value.length > 0) {
      result[name] = value;
    }
  }
  return result;
}

/** Narrows an unknown parsed body to a flat record lookup. */
function asRecord(body: unknown): Record<string, unknown> | undefined {
  if (typeof body === "object" && body !== null && !Array.isArray(body)) {
    return body as Record<string, unknown>;
  }
  return undefined;
}

/**
 * Best effort extraction of the API error code (q4).
 *
 * @param body - Parsed response body.
 * @returns The code, or `undefined` when absent / not a string.
 */
export function extractErrorCode(body: unknown): string | undefined {
  const record = asRecord(body);
  if (record === undefined) {
    return undefined;
  }
  for (const key of CODE_KEYS) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

/**
 * Best effort extraction of the request id: response headers first, then the
 * body (q4).
 *
 * @param headers - Lower-cased header snapshot.
 * @param body - Parsed response body.
 * @returns The request id, or `undefined` when absent.
 */
export function extractRequestId(
  headers: Readonly<Record<string, string>>,
  body: unknown,
): string | undefined {
  for (const name of REQUEST_ID_HEADERS) {
    const value = headers[name];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  const record = asRecord(body);
  if (record === undefined) {
    return undefined;
  }
  for (const key of REQUEST_ID_KEYS) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

/**
 * Builds the {@link TakasumiBotKitHttpError} for a non 2xx response.
 *
 * The body is parsed on a best effort basis: when it is not valid JSON the raw
 * text is kept on `rawBody` and the error is still an HTTP error
 * (q17: "HttpError 優先").
 *
 * @param params - Status, request context, raw body and headers.
 * @returns The HTTP error to throw (retryable for 429/5xx).
 */
export function createHttpError(params: {
  readonly status: number;
  readonly statusText: string;
  readonly url: string;
  readonly method: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly rawBody: string | undefined;
  readonly parsedBody: unknown;
  readonly cause?: unknown;
}): TakasumiBotKitHttpError {
  return new TakasumiBotKitHttpError(
    {
      status: params.status,
      statusText: params.statusText,
      url: params.url,
      method: params.method,
      headers: params.headers,
      body: params.parsedBody,
      rawBody: params.rawBody,
      code: extractErrorCode(params.parsedBody),
      requestId: extractRequestId(params.headers, params.parsedBody),
      retryAfter: params.headers["retry-after"],
    },
    params.cause === undefined ? {} : { cause: params.cause },
  );
}
