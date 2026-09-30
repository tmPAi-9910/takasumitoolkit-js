import { TakasumiBotKitConfigError } from "../errors";

/** Retry configuration of a client. */
export interface RetryConfig {
  /** Maximum number of retries after the initial attempt. `0` disables retries. */
  readonly maxRetries: number;
  /** Delay before the first retry, in milliseconds. */
  readonly initialDelayMs: number;
  /** Upper bound of the exponential backoff, in milliseconds. */
  readonly maxDelayMs: number;
  /** Multiplier applied to the delay after every retry. */
  readonly backoffFactor: number;
  /** Whether to randomise the delay in the `[50%, 100%]` range. */
  readonly jitter: boolean;
}

/** Retry defaults documented in `docs/RETRY.md`. */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 300,
  maxDelayMs: 5000,
  backoffFactor: 2,
  jitter: true,
};

/**
 * Validates a partial retry configuration and merges it with the defaults.
 *
 * @param retry - User supplied (partial) retry configuration.
 * @returns A fully resolved {@link RetryConfig}.
 * @throws {TakasumiBotKitConfigError} When a value is invalid, or when
 *   `initialDelayMs > maxDelayMs` (q6).
 *
 * @example
 * ```ts
 * resolveRetryConfig({ maxRetries: 0 }); // retries disabled, other defaults kept
 * ```
 */
export function resolveRetryConfig(retry: Partial<RetryConfig> | undefined): RetryConfig {
  if (retry === undefined) {
    return DEFAULT_RETRY_CONFIG;
  }
  if (typeof retry !== "object" || Array.isArray(retry)) {
    throw new TakasumiBotKitConfigError("retry must be an object", {
      field: "retry",
      value: retry,
    });
  }

  const maxRetries = pick(retry.maxRetries, DEFAULT_RETRY_CONFIG.maxRetries, {
    field: "retry.maxRetries",
    integer: true,
    min: 0,
  });
  const initialDelayMs = pick(retry.initialDelayMs, DEFAULT_RETRY_CONFIG.initialDelayMs, {
    field: "retry.initialDelayMs",
    min: 0,
  });
  const maxDelayMs = pick(retry.maxDelayMs, DEFAULT_RETRY_CONFIG.maxDelayMs, {
    field: "retry.maxDelayMs",
    min: 0,
  });
  const backoffFactor = pick(retry.backoffFactor, DEFAULT_RETRY_CONFIG.backoffFactor, {
    field: "retry.backoffFactor",
    min: 1,
  });

  if (initialDelayMs > maxDelayMs) {
    throw new TakasumiBotKitConfigError(
      "retry.initialDelayMs must be less than or equal to retry.maxDelayMs",
      { field: "retry.initialDelayMs", value: initialDelayMs },
    );
  }

  if (retry.jitter !== undefined && typeof retry.jitter !== "boolean") {
    throw new TakasumiBotKitConfigError("retry.jitter must be a boolean", {
      field: "retry.jitter",
      value: retry.jitter,
    });
  }

  return {
    maxRetries,
    initialDelayMs,
    maxDelayMs,
    backoffFactor,
    jitter: retry.jitter ?? DEFAULT_RETRY_CONFIG.jitter,
  };
}

interface NumericRule {
  readonly field: string;
  readonly min: number;
  readonly integer?: boolean;
}

/** Reads one numeric retry field, applying `rule` and falling back to `fallback`. */
function pick(value: number | undefined, fallback: number, rule: NumericRule): number {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TakasumiBotKitConfigError(`${rule.field} must be a finite number`, {
      field: rule.field,
      value,
    });
  }
  if (rule.integer === true && !Number.isInteger(value)) {
    throw new TakasumiBotKitConfigError(`${rule.field} must be an integer`, {
      field: rule.field,
      value,
    });
  }
  if (value < rule.min) {
    throw new TakasumiBotKitConfigError(`${rule.field} must be >= ${rule.min}`, {
      field: rule.field,
      value,
    });
  }
  return value;
}
