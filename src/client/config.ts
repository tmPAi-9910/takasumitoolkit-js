import { TakasumiBotKitConfigError } from "../errors";
import { createLogger, type RequiredLogger } from "../internal/logger";
import { resolveRetryConfig, type RetryConfig } from "../retry";
import type { FetchLike, KitClientConfig, Logger } from "./types";

/** Default per-attempt timeout, in milliseconds. */
export const DEFAULT_TIMEOUT_MS = 10_000;

/** Default stock list cache TTL, in milliseconds (60 s). */
export const DEFAULT_STOCK_CACHE_TTL_MS = 60_000;

/** Fully resolved client configuration. */
export interface ResolvedConfig {
  /** Resolved base URL (trailing slash removed), read-only for consumers. */
  readonly baseUrl: string;
  /** Per-attempt timeout in ms. */
  readonly timeoutMs: number;
  /** Headers added to every request. */
  readonly headers: Readonly<Record<string, string>>;
  /** `fetch` implementation. */
  readonly fetchImpl: FetchLike;
  /** Logger with all four methods populated. */
  readonly logger: RequiredLogger;
  /** Retry configuration. */
  readonly retry: RetryConfig;
  /** Stock list cache settings. */
  readonly stockCache: ResolvedStockCacheConfig;
}

/** Resolved stock cache settings. */
export interface ResolvedStockCacheConfig {
  /** Whether the cache is enabled (default: `false`). */
  readonly enabled: boolean;
  /** TTL in ms. Only meaningful when `enabled` is `true`. */
  readonly ttlMs: number;
}

/**
 * Reads `globalThis.fetch`, failing with a clear error when the runtime has
 * none (Node < 18 without a polyfill).
 *
 * @returns The global `fetch`, bound to `globalThis`.
 * @throws {TakasumiBotKitConfigError} When no global `fetch` exists.
 */
function defaultFetch(): FetchLike {
  const globalFetch = globalThis.fetch;
  if (typeof globalFetch !== "function") {
    throw new TakasumiBotKitConfigError(
      "No global fetch implementation found; pass one through basicConfig.fetch",
      { field: "fetch" },
    );
  }
  return (input, init) => globalFetch(input, init);
}

/**
 * Validates a partial retry config, headers, logger, timeout and stock cache,
 * and merges them with the defaults.
 *
 * @param config - User supplied configuration (may be `undefined`).
 * @param baseUrl - Already resolved base URL.
 * @returns A fully populated {@link ResolvedConfig}.
 * @throws {TakasumiBotKitConfigError} When any value is invalid.
 *
 * @example
 * ```ts
 * const resolved = resolveConfig({ timeoutMs: 5000 }, "https://api.takasumibot.com");
 * resolved.timeoutMs; // 5000
 * ```
 */
export function resolveConfig(
  config: KitClientConfig | undefined,
  baseUrl: string,
): ResolvedConfig {
  const source: KitClientConfig = config ?? {};

  if (typeof source !== "object" || Array.isArray(source)) {
    throw new TakasumiBotKitConfigError("config must be an object", {
      field: "config",
      value: source,
    });
  }

  return {
    baseUrl,
    timeoutMs: resolveTimeoutMs(source.timeoutMs),
    headers: resolveHeaders(source.headers),
    fetchImpl: resolveFetch(source.fetch),
    logger: createLogger(resolveLogger(source.logger)),
    retry: resolveRetryConfig(source.retry),
    stockCache: resolveStockCache(source.stockCache),
  };
}

/** Validates `timeoutMs` (must be a finite number greater than 0). */
function resolveTimeoutMs(timeoutMs: number | undefined): number {
  if (timeoutMs === undefined) {
    return DEFAULT_TIMEOUT_MS;
  }
  if (typeof timeoutMs !== "number" || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new TakasumiBotKitConfigError("timeoutMs must be a finite number greater than 0", {
      field: "timeoutMs",
      value: timeoutMs,
    });
  }
  return timeoutMs;
}

/** Validates `headers` (must be a plain object). */
function resolveHeaders(
  headers: Readonly<Record<string, string>> | undefined,
): Readonly<Record<string, string>> {
  if (headers === undefined) {
    return {};
  }
  if (typeof headers !== "object" || Array.isArray(headers)) {
    throw new TakasumiBotKitConfigError("headers must be an object", {
      field: "headers",
      value: headers,
    });
  }
  return { ...headers };
}

/** Validates `fetch` (must be a function) and binds the global one by default. */
function resolveFetch(fetchImpl: FetchLike | undefined): FetchLike {
  if (fetchImpl === undefined) {
    return defaultFetch();
  }
  if (typeof fetchImpl !== "function") {
    throw new TakasumiBotKitConfigError("fetch must be a function", {
      field: "fetch",
      value: fetchImpl,
    });
  }
  return fetchImpl;
}

/** Validates `logger` (object whose present methods are functions). */
function resolveLogger(logger: Logger | undefined): Logger | undefined {
  if (logger === undefined) {
    return undefined;
  }
  if (typeof logger !== "object" || Array.isArray(logger)) {
    throw new TakasumiBotKitConfigError("logger must be an object", {
      field: "logger",
      value: logger,
    });
  }
  for (const key of ["debug", "info", "warn", "error"] as const) {
    const method = logger[key];
    if (method !== undefined && typeof method !== "function") {
      throw new TakasumiBotKitConfigError(`logger.${key} must be a function`, {
        field: `logger.${key}`,
        value: method,
      });
    }
  }
  return logger;
}

/**
 * Resolves the stock cache settings.
 *
 * - `undefined` / `false` → disabled (default)
 * - `{}` → enabled with the default TTL (60 000 ms)
 * - `{ ttlMs }` → enabled with the given TTL
 *
 * @param stockCache - User supplied value.
 * @returns The resolved settings.
 * @throws {TakasumiBotKitConfigError} When `ttlMs` is not a finite number `> 0`.
 *
 * @example
 * ```ts
 * resolveStockCache(undefined); // { enabled: false, ttlMs: 60000 }
 * resolveStockCache({}); // { enabled: true, ttlMs: 60000 }
 * ```
 */
export function resolveStockCache(
  stockCache: KitClientConfig["stockCache"],
): ResolvedStockCacheConfig {
  if (stockCache === undefined || stockCache === false) {
    return { enabled: false, ttlMs: DEFAULT_STOCK_CACHE_TTL_MS };
  }
  if (typeof stockCache !== "object" || Array.isArray(stockCache)) {
    throw new TakasumiBotKitConfigError(
      "stockCache must be false or an object like `{ ttlMs: 60000 }`",
      { field: "stockCache", value: stockCache },
    );
  }
  if (stockCache.ttlMs === undefined) {
    return { enabled: true, ttlMs: DEFAULT_STOCK_CACHE_TTL_MS };
  }
  const { ttlMs } = stockCache;
  if (typeof ttlMs !== "number" || !Number.isFinite(ttlMs) || ttlMs <= 0) {
    throw new TakasumiBotKitConfigError("stockCache.ttlMs must be a finite number greater than 0", {
      field: "stockCache.ttlMs",
      value: ttlMs,
    });
  }
  return { enabled: true, ttlMs };
}
