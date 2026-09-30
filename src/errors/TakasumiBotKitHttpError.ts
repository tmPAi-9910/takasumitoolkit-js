import { TakasumiBotKitError, type TakasumiBotKitErrorOptions } from "./TakasumiBotKitError";

/** HTTP status codes that are considered transient and therefore retried. */
export const RETRYABLE_STATUS_CODES: readonly number[] = [429, 500, 502, 503, 504];

/**
 * Returns `true` when an HTTP status code is transient (429 / 5xx gateway-ish).
 *
 * @param status - HTTP status code.
 * @returns `true` when a retry may succeed.
 */
export function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUS_CODES.includes(status);
}

/**
 * Thrown when the API answers with a non 2xx HTTP status.
 *
 * `code` and `requestId` are best effort: they are searched in a few well known
 * response headers first, then in the response body, and stay `undefined` when
 * the API does not provide them (the OpenAPI document does not define them).
 *
 * @example
 * ```ts
 * try {
 *   await kit.getGiftInfo("Abc123Xyz0");
 * } catch (error) {
 *   if (error instanceof TakasumiBotKitHttpError && error.status === 404) {
 *     console.error("not found", error.requestId);
 *   }
 * }
 * ```
 */
export class TakasumiBotKitHttpError extends TakasumiBotKitError {
  /** HTTP status code (e.g. `404`). */
  readonly status: number;

  /** HTTP status text as returned by the server. */
  readonly statusText: string;

  /** Request URL that produced the error. */
  readonly url: string;

  /** HTTP method of the request. */
  readonly method: string;

  /** Lower-cased response headers (best effort snapshot). */
  readonly headers: Readonly<Record<string, string>>;

  /** Parsed response body (JSON object when parsable, otherwise the raw text). */
  readonly body: unknown;

  /** Raw response body text, always kept for debugging. */
  readonly rawBody: string | undefined;

  /** API error code when the response exposes one (`code` / `errorCode` / `error_code`). */
  readonly code: string | undefined;

  /** Request id when the response exposes one (headers first, then body). */
  readonly requestId: string | undefined;

  /** Raw `Retry-After` header value, when present. */
  readonly retryAfter: string | undefined;

  /**
   * Creates an HTTP error.
   *
   * @param params - Status, request context and (best effort) body information.
   * @param options - Inherited `cause`.
   */
  constructor(
    params: {
      readonly status: number;
      readonly statusText?: string;
      readonly url: string;
      readonly method: string;
      readonly headers?: Readonly<Record<string, string>>;
      readonly body?: unknown;
      readonly rawBody?: string;
      readonly code?: string;
      readonly requestId?: string;
      readonly retryAfter?: string;
    },
    options: TakasumiBotKitErrorOptions = {},
  ) {
    super(
      `HTTP ${params.status}${params.statusText ? ` ${params.statusText}` : ""} for ${params.method} ${params.url}`,
      { ...options, retryable: isRetryableStatus(params.status) },
    );
    this.status = params.status;
    this.statusText = params.statusText ?? "";
    this.url = params.url;
    this.method = params.method;
    this.headers = params.headers ?? {};
    this.body = params.body;
    this.rawBody = params.rawBody;
    this.code = params.code;
    this.requestId = params.requestId;
    this.retryAfter = params.retryAfter;
  }
}
