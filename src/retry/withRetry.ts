import {
  TakasumiBotKitError,
  TakasumiBotKitHttpError,
  TakasumiBotKitRetryLimitError,
} from "../errors";
import type { RequiredLogger } from "../internal/logger";
import { sleep } from "../internal/sleep";
import { computeRetryDelay } from "./backoff";
import { isRetryableError } from "./isRetryable";
import type { RetryConfig } from "./retryConfig";

/** Context used by {@link withRetry} for logging and error enrichment. */
export interface RetryContext {
  /** Request URL (used for logs and {@link TakasumiBotKitRetryLimitError}). */
  readonly url: string;
  /** HTTP method. */
  readonly method: string;
  /** Logger used to report retries (all methods may be omitted). */
  readonly logger: RequiredLogger;
  /** Injectable sleep, mainly for tests. Defaults to a `setTimeout` promise. */
  readonly sleepFn?: (ms: number) => Promise<void>;
  /** Injectable random source, mainly for tests. Defaults to `Math.random`. */
  readonly random?: () => number;
}

/** Converts an unknown thrown value into a typed SDK error. */
function toKitError(error: unknown, url: string, method: string): TakasumiBotKitError {
  if (error instanceof TakasumiBotKitError) {
    return error;
  }
  // `fetch` implementations may reject with non SDK values; treating them as
  // network errors keeps the retry decision meaningful.
  return new TakasumiBotKitError(
    `Unexpected failure for ${method} ${url}: ${error instanceof Error ? error.message : String(error)}`,
    { cause: error },
  );
}

/**
 * Runs `operation`, retrying transient failures with exponential backoff.
 *
 * - Transient failures are network errors, timeouts and HTTP
 *   `429 / 500 / 502 / 503 / 504`.
 * - `Retry-After` takes precedence over the backoff (clipped to
 *   `maxDelayMs * 3`).
 * - When `maxRetries` is exhausted a {@link TakasumiBotKitRetryLimitError}
 *   carrying the last error is thrown. With `maxRetries: 0` the original error
 *   is rethrown untouched.
 *
 * @param operation - The attempt to run (must be safe to call repeatedly).
 * @param config - Resolved retry configuration.
 * @param context - URL, method, logger and optional test injections.
 * @returns Whatever `operation` resolves to.
 * @throws {TakasumiBotKitRetryLimitError} When retries are exhausted.
 * @throws {TakasumiBotKitError} The original error when it is not retryable or
 *   when retries are disabled.
 *
 * @example
 * ```ts
 * await withRetry(() => fetchOnce(), retry, { url, method, logger });
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  context: RetryContext,
): Promise<T> {
  const wait = context.sleepFn ?? sleep;
  const { logger } = context;
  let attempt = 0;

  for (;;) {
    try {
      return await operation();
    } catch (error) {
      const kitError = toKitError(error, context.url, context.method);
      if (!isRetryableError(kitError)) {
        throw kitError;
      }
      if (config.maxRetries <= 0) {
        throw kitError;
      }
      if (attempt >= config.maxRetries) {
        const retryLimitError = new TakasumiBotKitRetryLimitError({
          lastError: kitError,
          attempts: attempt + 1,
          maxRetries: config.maxRetries,
          url: context.url,
          method: context.method,
        });
        logger.error(
          `Retry limit exceeded for ${context.method} ${context.url} after ${retryLimitError.attempts} attempts`,
          { url: context.url, method: context.method, attempts: retryLimitError.attempts },
        );
        throw retryLimitError;
      }

      const delay = computeRetryDelay({
        attempt,
        config,
        retryAfter: kitError instanceof TakasumiBotKitHttpError ? kitError.retryAfter : undefined,
        random: context.random,
      });
      attempt += 1;
      logger.warn(
        `Retrying ${context.method} ${context.url} (attempt ${attempt}/${config.maxRetries}) after ${delay}ms due to ${kitError.name}: ${kitError.message}`,
        {
          url: context.url,
          method: context.method,
          attempt,
          maxRetries: config.maxRetries,
          delay,
          error: kitError,
        },
      );
      await wait(delay);
    }
  }
}
