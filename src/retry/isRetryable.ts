import {
  TakasumiBotKitError,
  TakasumiBotKitHttpError,
  TakasumiBotKitNetworkError,
  TakasumiBotKitTimeoutError,
} from "../errors";

/**
 * Decides whether a failed attempt may be retried.
 *
 * Retryable: network errors, timeouts and HTTP `429 / 500 / 502 / 503 / 504`.
 * Everything else (validation, configuration, parse and non transient HTTP
 * errors) is not.
 *
 * @param error - The caught value.
 * @returns `true` when the operation should be attempted again.
 *
 * @example
 * ```ts
 * isRetryableError(new TakasumiBotKitNetworkError("boom", { url, method })); // true
 * ```
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof TakasumiBotKitNetworkError) {
    return true;
  }
  if (error instanceof TakasumiBotKitTimeoutError) {
    return true;
  }
  if (error instanceof TakasumiBotKitHttpError) {
    return error.retryable === true;
  }
  if (error instanceof TakasumiBotKitError) {
    return error.retryable === true;
  }
  return false;
}
