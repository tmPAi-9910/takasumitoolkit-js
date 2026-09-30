import type { RetryConfig } from "./retryConfig";

/** Parameters used to compute the delay before the next attempt. */
export interface RetryDelayInput {
  /** Zero based retry index (`0` = delay before the first retry). */
  readonly attempt: number;
  /** Resolved retry configuration. */
  readonly config: RetryConfig;
  /** Raw `Retry-After` header of the failed response, when present. */
  readonly retryAfter?: string | undefined;
  /** Current timestamp in ms. Defaults to `Date.now()`. */
  readonly now?: number;
  /** Random source in `[0, 1)`. Defaults to `Math.random`. */
  readonly random?: () => number;
}

const SECONDS_LITERAL = /^\d+(?:\.\d+)?$/;

/**
 * Parses a `Retry-After` header value.
 *
 * Both forms defined by RFC 9110 are supported:
 *
 * - delay-seconds (`"120"` → `120000`)
 * - HTTP-date (`"Wed, 21 Oct 2015 07:28:00 GMT"` → delta from `now`)
 *
 * @param value - Raw header value.
 * @param now - Current timestamp in ms (used for the HTTP-date form).
 * @returns The delay in milliseconds, or `undefined` when unparsable.
 *
 * @example
 * ```ts
 * parseRetryAfterMs("120", 0); // 120000
 * ```
 */
export function parseRetryAfterMs(value: string | undefined, now: number): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  if (SECONDS_LITERAL.test(trimmed)) {
    const seconds = Number(trimmed);
    if (!Number.isFinite(seconds) || seconds < 0) {
      return undefined;
    }
    return Math.round(seconds * 1000);
  }
  const date = Date.parse(trimmed);
  if (Number.isNaN(date)) {
    return undefined;
  }
  return Math.max(0, date - now);
}

/**
 * Computes the delay before the next attempt.
 *
 * A parsable `Retry-After` header wins over the backoff, but is clipped to
 * `maxDelayMs * 3` (q5: `clip_3x`). Otherwise the delay is
 * `min(initialDelayMs * backoffFactor^attempt, maxDelayMs)`, optionally
 * jittered down into the `[50%, 100%]` range.
 *
 * @param input - Attempt index, configuration and optional `Retry-After`.
 * @returns The delay in milliseconds.
 *
 * @example
 * ```ts
 * computeRetryDelay({ attempt: 0, config: DEFAULT_RETRY_CONFIG, random: () => 0 });
 * // 150 (300 * 0.5)
 * ```
 */
export function computeRetryDelay(input: RetryDelayInput): number {
  const { config, attempt } = input;
  const now = input.now ?? Date.now();
  const random = input.random ?? Math.random;

  const retryAfterMs = parseRetryAfterMs(input.retryAfter, now);
  if (retryAfterMs !== undefined) {
    return Math.min(retryAfterMs, config.maxDelayMs * 3);
  }

  const exponential = config.initialDelayMs * config.backoffFactor ** attempt;
  const capped = Math.min(exponential, config.maxDelayMs);
  return Math.round(config.jitter ? capped * (0.5 + random() * 0.5) : capped);
}
