import type { ResolvedStockCacheConfig } from "../client/config";
import type { StockEntry } from "../schemas";

/** Provides the stock list, either from the network or from the cache. */
export type StockListProvider = () => Promise<StockEntry[]>;

/** Cached entry with its expiration timestamp. */
interface CacheEntry {
  readonly data: StockEntry[];
  readonly expiresAt: number;
}

/**
 * Client scoped, opt-in cache for `GET /v3/stock/`.
 *
 * - Disabled by default: every call performs a request.
 * - When enabled, a fetched list is reused until `ttlMs` elapses.
 * - Concurrent misses share a single in-flight request (single-flight), so a
 *   burst of calls cannot stampede the API.
 */
export interface StockListCache {
  /** Returns a fresh cached list, or fetches (and caches) a new one. */
  get(fetchList: StockListProvider): Promise<StockEntry[]>;
  /** Drops the cached list (and, when enabled, the shared in-flight request). */
  clear(): void;
}

/**
 * Creates the stock list cache described in `docs/STOCK.md`.
 *
 * @param config - Resolved `stockCache` settings.
 * @param now - Injectable clock (tests). Defaults to `Date.now`.
 * @returns A {@link StockListCache}.
 *
 * @example
 * ```ts
 * const cache = createStockListCache({ enabled: true, ttlMs: 60_000 });
 * await cache.get(() => kit.getStockList()); // request
 * await cache.get(() => kit.getStockList()); // cached
 * ```
 */
export function createStockListCache(
  config: ResolvedStockCacheConfig,
  now: () => number = Date.now,
): StockListCache {
  let entry: CacheEntry | undefined;
  let inflight: Promise<StockEntry[]> | undefined;

  return {
    async get(fetchList) {
      if (!config.enabled) {
        return fetchList();
      }
      const current = now();
      if (entry !== undefined && entry.expiresAt > current) {
        return entry.data;
      }
      if (inflight !== undefined) {
        return inflight;
      }
      inflight = (async () => {
        const data = await fetchList();
        entry = { data, expiresAt: now() + config.ttlMs };
        return data;
      })();
      try {
        return await inflight;
      } finally {
        inflight = undefined;
      }
    },
    clear() {
      entry = undefined;
      inflight = undefined;
    },
  };
}
