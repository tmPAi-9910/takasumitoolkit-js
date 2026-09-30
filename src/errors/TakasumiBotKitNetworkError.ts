import { TakasumiBotKitError, type TakasumiBotKitErrorOptions } from "./TakasumiBotKitError";

/**
 * Thrown when `fetch` itself rejects (DNS failure, connection refused, TLS
 * error, body stream failure, ...).
 *
 * Network errors are always retryable.
 *
 * @example
 * ```ts
 * try {
 *   await kit.getTaxInfo();
 * } catch (error) {
 *   if (error instanceof TakasumiBotKitNetworkError) {
 *     console.error(error.url, error.cause);
 *   }
 * }
 * ```
 */
export class TakasumiBotKitNetworkError extends TakasumiBotKitError {
  /** Request URL that failed. */
  readonly url: string;

  /** HTTP method of the request. */
  readonly method: string;

  /**
   * Creates a network error.
   *
   * @param message - Human readable description.
   * @param params - Request context.
   * @param options - Inherited `cause` (the original `fetch` rejection).
   */
  constructor(
    message: string,
    params: { readonly url: string; readonly method: string },
    options: TakasumiBotKitErrorOptions = {},
  ) {
    super(message, { ...options, retryable: true });
    this.url = params.url;
    this.method = params.method;
  }
}
