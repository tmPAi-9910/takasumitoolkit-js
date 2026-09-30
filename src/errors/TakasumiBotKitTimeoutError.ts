import { TakasumiBotKitError, type TakasumiBotKitErrorOptions } from "./TakasumiBotKitError";

/**
 * Thrown when a request does not complete within `basicConfig.timeoutMs`.
 *
 * Timeouts are always retryable; the timeout applies to each attempt
 * independently (there is no global deadline).
 *
 * @example
 * ```ts
 * try {
 *   await kit.getTaxInfo();
 * } catch (error) {
 *   if (error instanceof TakasumiBotKitTimeoutError) {
 *     console.error(`${error.url} timed out after ${error.timeoutMs}ms`);
 *   }
 * }
 * ```
 */
export class TakasumiBotKitTimeoutError extends TakasumiBotKitError {
  /** Timeout (ms) that was exceeded by this single attempt. */
  readonly timeoutMs: number;

  /** Request URL that timed out. */
  readonly url: string;

  /** HTTP method of the request. */
  readonly method: string;

  /**
   * Creates a timeout error.
   *
   * @param params - Timeout, request context.
   * @param options - Inherited `cause` (typically an `AbortError`).
   */
  constructor(
    params: { readonly timeoutMs: number; readonly url: string; readonly method: string },
    options: TakasumiBotKitErrorOptions = {},
  ) {
    super(`Request timed out after ${params.timeoutMs}ms (${params.method} ${params.url})`, {
      ...options,
      retryable: true,
    });
    this.timeoutMs = params.timeoutMs;
    this.url = params.url;
    this.method = params.method;
  }
}
