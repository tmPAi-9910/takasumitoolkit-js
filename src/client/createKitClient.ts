import {
  getCompanyById,
  getCompanyHistoryById,
  getCompanyList,
  getDiscordUserByName,
  getGiftInfo,
  getHistoryById,
  getProfileById,
  getRanking,
  getShardInfo,
  getStatisticsInfo,
  getStatus,
  getStockList,
  getTaxInfo,
} from "../api";
import { helpers } from "../helpers";
import { createStockBuilder } from "../stock";
import { createStockListCache } from "../stock/cache";
import { getStockHistoryById } from "../stock/getStockHistoryById";
import { getStockInfoById } from "../stock/getStockInfoById";
import { getStockPriceById } from "../stock/getStockPriceById";
import { resolveBaseUrl } from "./baseUrl";
import { resolveConfig } from "./config";
import type { KitClient, KitClientConfig } from "./types";

/**
 * Creates a TakasumiBOT kit client.
 *
 * The client bundles every HTTP endpoint declared in
 * `TakasumiBOT-OpenAPI-Document.json` plus the client side Stock helpers.
 *
 * Notes:
 *
 * - No authentication is required (and none is supported): the API is public.
 * - `baseUrl` is **not** configurable here. It is resolved from
 *   `process.env.TAKASUMIBOT_BASE_URL` (Node/Bun) and falls back to the OpenAPI
 *   `servers[0].url`; it is exposed read-only as `kit.baseUrl`.
 * - The WebSocket endpoint `/v3/realtime/` is intentionally not implemented.
 *
 * @param config - Optional client configuration (timeout, headers, retry,
 *   fetch, logger, stockCache). See {@link KitClientConfig}.
 * @returns A {@link KitClient}.
 * @throws {TakasumiBotKitConfigError} When a configuration value is invalid
 *   (for example `retry.initialDelayMs > retry.maxDelayMs`, or
 *   `stockCache.ttlMs <= 0`).
 *
 * @example
 * ```ts
 * import { createKitClient } from "takasumibot-kit";
 *
 * const kit = createKitClient({
 *   timeoutMs: 10_000,
 *   retry: { maxRetries: 3 },
 *   stockCache: { ttlMs: 60_000 },
 *   logger: { warn: console.warn },
 * });
 *
 * const tax = await kit.getTaxInfo();
 * console.log(kit.baseUrl); // "https://api.takasumibot.com"
 * ```
 */
export function createKitClient(config?: KitClientConfig): KitClient {
  const resolved = resolveConfig(config, resolveBaseUrl());
  const stockCache = createStockListCache(resolved.stockCache);

  const fetchStockList = (): ReturnType<typeof getStockList> => getStockList(resolved);
  const getStockListCached = (): ReturnType<typeof getStockList> => stockCache.get(fetchStockList);

  const client: KitClient = {
    get baseUrl(): string {
      return resolved.baseUrl;
    },
    helpers,

    getGiftInfo: (id) => getGiftInfo(resolved, id),
    getTaxInfo: () => getTaxInfo(resolved),
    getShardInfo: () => getShardInfo(resolved),
    getStatisticsInfo: () => getStatisticsInfo(resolved),
    getHistoryById: (id) => getHistoryById(resolved, id),
    getProfileById: (id) => getProfileById(resolved, id),
    getRanking: () => getRanking(resolved),
    getCompanyList: () => getCompanyList(resolved),
    getCompanyById: (id) => getCompanyById(resolved, id),
    getStockList: getStockListCached,
    getDiscordUserByName: (name) => getDiscordUserByName(resolved, name),
    getCompanyHistoryById: (id) => getCompanyHistoryById(resolved, id),
    getStatus: () => getStatus(resolved),

    getStock: () => createStockBuilder(getStockListCached),
    getStockInfoById: (id) => getStockInfoById(getStockListCached, id),
    getStockPriceById: (id) => getStockPriceById(getStockListCached, id),
    getStockHistoryById: (id, options) => getStockHistoryById(getStockListCached, id, options),
  };

  return Object.freeze(client);
}
