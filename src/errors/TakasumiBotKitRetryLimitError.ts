import { TakasumiBotKitError } from "./TakasumiBotKitError";
import type { TakasumiBotKitErrorOptions } from "./TakasumiBotKitError";

/**
 * Thrown when a retryable failure keeps happening and `retry.maxRetries` is
 * exhausted.
 *
 * The last error is available both as `cause` (standard) and as the typed
 * `lastError` field. A `TakasumiBotKitRetryLimitError` is not retried again.
 *
 * @example
 * ```ts
 * try {
 *   await kit.getTaxInfo();
 * } catch (error) {
 *   if (error instanceof TakasumiBotKitRetryLimitError) {
 *     console.error(error.attempts, error.maxRetries, error.lastError.name);
 *   }
 * }
 * ```
 */
export class TakasumiBotKitRetryLimitError extends TakasumiBotKitError {
  /** Total number of attempts performed (initial attempt + retries). */
  readonly attempts: number;

  /** Configured maximum number of retries. */
  readonly maxRetries: number;

  /** The last error observed, typed as an SDK error. */
  readonly lastError: TakasumiBotKitError;

  /** Request URL that failed. */
  readonly url: string;

  /** HTTP method of the request. */
  readonly method: string;

  /**
   * Creates a retry-limit error.
   *
   * @param params - Last error, attempt counters and request context.
   * @param options - Additional overrides (rarely needed).
   */
  constructor(
    params: {
      readonly lastError: TakasumiBotKitError;
      readonly attempts: number;
      readonly maxRetries: number;
      readonly url: string;
      readonly method: string;
    },
    options: TakasumiBotKitErrorOptions = {},
  ) {
    super(
      `Retry limit exceeded after ${params.attempts} attempts (maxRetries=${params.maxRetries}) for ${params.method} ${params.url}`,
      { ...options, cause: options.cause ?? params.lastError, retryable: false },
    );
    this.attempts = params.attempts;
    this.maxRetries = params.maxRetries;
    this.lastError = params.lastError;
    this.url = params.url;
    this.method = params.method;
  }
}
