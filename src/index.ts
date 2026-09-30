/**
 * `takasumibot-kit` — a strict, dependency-light TypeScript client for the
 * TakasumiBOT public API (v3).
 *
 * The OpenAPI document shipped in this repository
 * (`TakasumiBOT-OpenAPI-Document.json`) is the single source of truth: every
 * method of {@link KitClient} maps to one declared HTTP path, and the
 * WebSocket endpoint `/v3/realtime/` is intentionally not implemented.
 *
 * @example
 * ```ts
 * import { createKitClient } from "takasumibot-kit";
 *
 * const kit = createKitClient({ timeoutMs: 10_000 });
 * const stocks = await kit.getStockList();
 * const price = await kit.getStock().id("JTTI").price();
 * ```
 *
 * @packageDocumentation
 */

export { createKitClient } from "./client/createKitClient";
export {
  DEFAULT_BASE_URL,
  BASE_URL_ENV_KEY,
  resolveBaseUrl,
  normalizeBaseUrl,
} from "./client/baseUrl";

export type {
  KitClient,
  KitClientConfig,
  Logger,
  FetchLike,
  StockCacheConfig,
  StockHistoryOptions,
} from "./client/types";

export type { RetryConfig } from "./retry";
export { DEFAULT_RETRY_CONFIG } from "./retry";

export {
  TakasumiBotKitError,
  TakasumiBotKitConfigError,
  TakasumiBotKitValidationError,
  TakasumiBotKitHttpError,
  TakasumiBotKitNetworkError,
  TakasumiBotKitTimeoutError,
  TakasumiBotKitRetryLimitError,
  TakasumiBotKitResponseParseError,
} from "./errors";
export type { TakasumiBotKitErrorOptions } from "./errors";
export type { TakasumiBotKitValidationErrorCode } from "./errors";

export type { StockBuilder, StockIdBuilder } from "./stock";

export type {
  GiftResponse,
  TaxResponse,
  TaxRateEntry,
  ShardResponse,
  ShardDataEntry,
  StatisticsResponse,
  HistoryEntry,
  ProfileResponse,
  RankingEntry,
  CompanyListEntry,
  CompanyEmployeeEntry,
  CompanyStatistics,
  CompanyDetailResponse,
  CompanyHistoryEntry,
  StockEntry,
  StockId,
  DiscordUserSearchResponse,
  StatusEntry,
} from "./schemas";
export { STOCK_IDS } from "./schemas";

export {
  truncate,
  pickFields,
  omitFields,
  toMarkdownTable,
  formatNumber,
  formatTimestamp,
  paginate,
  getRecentStockHistory,
} from "./helpers";
export type { Helpers } from "./helpers";
export type {
  TruncateOptions,
  MarkdownTableCell,
  MarkdownTableRow,
  MarkdownTableAlign,
  ToMarkdownTableOptions,
  FormatNumberOptions,
  TimestampInput,
  TimestampFormat,
  FormatTimestampOptions,
  PaginateResult,
} from "./helpers";
