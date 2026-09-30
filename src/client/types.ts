import type {
  CompanyDetailResponse,
  CompanyHistoryEntry,
  CompanyListEntry,
  DiscordUserSearchResponse,
  GiftResponse,
  HistoryEntry,
  ProfileResponse,
  RankingEntry,
  ShardResponse,
  StatisticsResponse,
  StatusEntry,
  StockEntry,
  TaxResponse,
} from "../schemas";
import type { RetryConfig } from "../retry";
import type { StockBuilder } from "../stock";
import type { Helpers } from "../helpers";

export type { RetryConfig };

/** Subset of `fetch` used by the client (compatible with the global one). */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Optional logger. Every method is optional; missing methods are no-ops.
 *
 * @example
 * ```ts
 * const kit = createKitClient({ logger: { warn: console.warn, error: console.error } });
 * ```
 */
export interface Logger {
  /** Verbose diagnostics (request/response details). */
  debug?: (message: string, meta?: unknown) => void;
  /** Informational messages. */
  info?: (message: string, meta?: unknown) => void;
  /** Warnings, e.g. "retrying after 300ms". */
  warn?: (message: string, meta?: unknown) => void;
  /** Errors, e.g. "retry limit exceeded". */
  error?: (message: string, meta?: unknown) => void;
}

/**
 * Stock list cache options.
 *
 * The cache is **disabled by default**. Pass an object to enable it.
 */
export interface StockCacheConfig {
  /**
   * How long a fetched stock list stays fresh, in milliseconds.
   * Defaults to `60000` (60 s). Must be a finite number `> 0`.
   */
  readonly ttlMs?: number;
}

/**
 * Configuration accepted by {@link createKitClient}.
 *
 * `baseUrl` is intentionally **not** configurable here: it is resolved from
 * `process.env.TAKASUMIBOT_BASE_URL` (Node/Bun) with the OpenAPI
 * `servers[0].url` as fallback, and is exposed read-only as `kit.baseUrl`.
 *
 * @example
 * ```ts
 * const kit = createKitClient({
 *   timeoutMs: 10_000,
 *   headers: { "user-agent": "my-bot/1.0" },
 *   retry: { maxRetries: 5 },
 *   stockCache: { ttlMs: 30_000 },
 * });
 * ```
 */
export interface KitClientConfig {
  /** Per-attempt timeout in milliseconds. Defaults to `10000`. Must be `> 0`. */
  readonly timeoutMs?: number;
  /** Extra headers merged into every request (they win over the SDK defaults). */
  readonly headers?: Readonly<Record<string, string>>;
  /** Partial retry overrides (see `docs/RETRY.md`). */
  readonly retry?: Partial<RetryConfig>;
  /** Custom `fetch` implementation. Defaults to `globalThis.fetch`. */
  readonly fetch?: FetchLike;
  /** Optional logger. */
  readonly logger?: Logger;
  /**
   * Client scoped cache for `GET /v3/stock/`.
   *
   * - omitted or `false` → disabled (default): every call performs a request.
   * - `{}` or `{ ttlMs }` → enabled, default TTL 60 000 ms.
   *
   * `ttlMs` must be a finite number greater than `0`, otherwise a
   * `TakasumiBotKitConfigError` is thrown.
   */
  readonly stockCache?: false | StockCacheConfig;
}

/**
 * The client returned by {@link createKitClient}.
 *
 * Every method performs at most one HTTP request against a path declared in
 * `TakasumiBOT-OpenAPI-Document.json` (Stock helpers derive their result from
 * `GET /v3/stock/` and issue no extra request).
 */
export interface KitClient {
  /**
   * Resolved base URL used by every request, read-only.
   *
   * @example
   * ```ts
   * kit.baseUrl; // "https://api.takasumibot.com"
   * ```
   */
  readonly baseUrl: string;

  /** Pure helper functions, also available as named exports. */
  readonly helpers: Helpers;

  /**
   * Fetches information about one gift code (`GET /v3/gift/{id}`).
   *
   * @param id - Gift code, exactly 10 alphanumeric characters.
   * @returns The gift information.
   * @throws {TakasumiBotKitValidationError} When `id` is not 10 alphanumeric characters.
   * @throws {TakasumiBotKitHttpError} When the API answers with a non 2xx status.
   * @throws {TakasumiBotKitNetworkError} When the network fails.
   * @throws {TakasumiBotKitTimeoutError} When the request exceeds `timeoutMs`.
   * @throws {TakasumiBotKitResponseParseError} When a 2xx body is invalid.
   * @throws {TakasumiBotKitRetryLimitError} When retries are exhausted.
   *
   * @example
   * ```ts
   * const gift = await kit.getGiftInfo("Abc123Xyz0");
   * ```
   */
  getGiftInfo(id: string): Promise<GiftResponse>;

  /**
   * Fetches every tax rate and interest rate (`GET /v3/tax/`).
   *
   * @returns The tax information.
   * @throws {TakasumiBotKitHttpError} When the API answers with a non 2xx status.
   * @throws {TakasumiBotKitNetworkError} When the network fails.
   * @throws {TakasumiBotKitTimeoutError} When the request exceeds `timeoutMs`.
   * @throws {TakasumiBotKitResponseParseError} When a 2xx body is invalid.
   * @throws {TakasumiBotKitRetryLimitError} When retries are exhausted.
   *
   * @example
   * ```ts
   * const tax = await kit.getTaxInfo();
   * ```
   */
  getTaxInfo(): Promise<TaxResponse>;

  /**
   * Fetches the shard snapshot (`GET /v3/shard/`).
   *
   * @returns Per shard counters and the time they were logged.
   * @throws {TakasumiBotKitHttpError} When the API answers with a non 2xx status.
   * @throws {TakasumiBotKitNetworkError} When the network fails.
   * @throws {TakasumiBotKitTimeoutError} When the request exceeds `timeoutMs`.
   * @throws {TakasumiBotKitResponseParseError} When a 2xx body is invalid.
   * @throws {TakasumiBotKitRetryLimitError} When retries are exhausted.
   *
   * @example
   * ```ts
   * const shard = await kit.getShardInfo();
   * ```
   */
  getShardInfo(): Promise<ShardResponse>;

  /**
   * Fetches the global bot statistics (`GET /v3/statistics/`).
   *
   * @returns User, company, economy and event statistics.
   * @throws {TakasumiBotKitHttpError} When the API answers with a non 2xx status.
   * @throws {TakasumiBotKitNetworkError} When the network fails.
   * @throws {TakasumiBotKitTimeoutError} When the request exceeds `timeoutMs`.
   * @throws {TakasumiBotKitResponseParseError} When a 2xx body is invalid.
   * @throws {TakasumiBotKitRetryLimitError} When retries are exhausted.
   *
   * @example
   * ```ts
   * const stats = await kit.getStatisticsInfo();
   * ```
   */
  getStatisticsInfo(): Promise<StatisticsResponse>;

  /**
   * Fetches the transaction history of a Discord user (`GET /v3/history/{id}`).
   *
   * @param id - Discord user id.
   * @returns The transaction history, oldest first.
   * @throws {TakasumiBotKitValidationError} When `id` is empty or blank.
   * @throws {TakasumiBotKitHttpError} When the API answers with a non 2xx status.
   * @throws {TakasumiBotKitNetworkError} When the network fails.
   * @throws {TakasumiBotKitTimeoutError} When the request exceeds `timeoutMs`.
   * @throws {TakasumiBotKitResponseParseError} When a 2xx body is invalid.
   * @throws {TakasumiBotKitRetryLimitError} When retries are exhausted.
   *
   * @example
   * ```ts
   * const history = await kit.getHistoryById("123456789012345678");
   * ```
   */
  getHistoryById(id: string): Promise<HistoryEntry[]>;

  /**
   * Fetches the profile of a Discord user (`GET /v3/profile/{id}`).
   *
   * @param id - Discord user id.
   * @returns Assets, chips and job of the user.
   * @throws {TakasumiBotKitValidationError} When `id` is empty or blank.
   * @throws {TakasumiBotKitHttpError} When the API answers with a non 2xx status.
   * @throws {TakasumiBotKitNetworkError} When the network fails.
   * @throws {TakasumiBotKitTimeoutError} When the request exceeds `timeoutMs`.
   * @throws {TakasumiBotKitResponseParseError} When a 2xx body is invalid.
   * @throws {TakasumiBotKitRetryLimitError} When retries are exhausted.
   *
   * @example
   * ```ts
   * const profile = await kit.getProfileById("123456789012345678");
   * ```
   */
  getProfileById(id: string): Promise<ProfileResponse>;

  /**
   * Fetches the assets ranking (`GET /v3/ranking/`).
   *
   * @returns The ranking entries (the API currently returns the top 50).
   * @throws {TakasumiBotKitHttpError} When the API answers with a non 2xx status.
   * @throws {TakasumiBotKitNetworkError} When the network fails.
   * @throws {TakasumiBotKitTimeoutError} When the request exceeds `timeoutMs`.
   * @throws {TakasumiBotKitResponseParseError} When a 2xx body is invalid.
   * @throws {TakasumiBotKitRetryLimitError} When retries are exhausted.
   *
   * @example
   * ```ts
   * const ranking = await kit.getRanking();
   * ```
   */
  getRanking(): Promise<RankingEntry[]>;

  /**
   * Fetches the list of companies (`GET /v3/companylist/`).
   *
   * @returns Every registered company.
   * @throws {TakasumiBotKitHttpError} When the API answers with a non 2xx status.
   * @throws {TakasumiBotKitNetworkError} When the network fails.
   * @throws {TakasumiBotKitTimeoutError} When the request exceeds `timeoutMs`.
   * @throws {TakasumiBotKitResponseParseError} When a 2xx body is invalid.
   * @throws {TakasumiBotKitRetryLimitError} When retries are exhausted.
   *
   * @example
   * ```ts
   * const companies = await kit.getCompanyList();
   * ```
   */
  getCompanyList(): Promise<CompanyListEntry[]>;

  /**
   * Fetches the detail of one company (`GET /v3/company/{id}`).
   *
   * @param id - Company id (10 characters) or the Discord user id of its owner.
   * @returns The company detail, including its statistics and employees.
   * @throws {TakasumiBotKitValidationError} When `id` is empty or blank.
   * @throws {TakasumiBotKitHttpError} When the API answers with a non 2xx status.
   * @throws {TakasumiBotKitNetworkError} When the network fails.
   * @throws {TakasumiBotKitTimeoutError} When the request exceeds `timeoutMs`.
   * @throws {TakasumiBotKitResponseParseError} When a 2xx body is invalid.
   * @throws {TakasumiBotKitRetryLimitError} When retries are exhausted.
   *
   * @example
   * ```ts
   * const company = await kit.getCompanyById("Abc123Xyz0");
   * ```
   */
  getCompanyById(id: string): Promise<CompanyDetailResponse>;

  /**
   * Fetches the whole stock list (`GET /v3/stock/`).
   *
   * This is the only stock endpoint of the OpenAPI document; every other stock
   * helper derives its result from this list and performs no extra request.
   *
   * @returns Every listed stock. `prices` is ascending in time (its last
   *   element is the newest price) and every `int64` value is a `bigint`.
   * @throws {TakasumiBotKitHttpError} When the API answers with a non 2xx status.
   * @throws {TakasumiBotKitNetworkError} When the network fails.
   * @throws {TakasumiBotKitTimeoutError} When the request exceeds `timeoutMs`.
   * @throws {TakasumiBotKitResponseParseError} When a 2xx body is invalid.
   * @throws {TakasumiBotKitRetryLimitError} When retries are exhausted.
   *
   * @example
   * ```ts
   * const stocks = await kit.getStockList();
   * ```
   */
  getStockList(): Promise<StockEntry[]>;

  /**
   * Looks up a Discord user by name (`GET /v3/discord/usersearch/{name}`).
   *
   * @param name - Discord username (trimmed, then URL encoded).
   * @returns The Discord user.
   * @throws {TakasumiBotKitValidationError} When `name` is empty or blank.
   * @throws {TakasumiBotKitHttpError} When the API answers with a non 2xx status.
   * @throws {TakasumiBotKitNetworkError} When the network fails.
   * @throws {TakasumiBotKitTimeoutError} When the request exceeds `timeoutMs`.
   * @throws {TakasumiBotKitResponseParseError} When a 2xx body is invalid.
   * @throws {TakasumiBotKitRetryLimitError} When retries are exhausted.
   *
   * @example
   * ```ts
   * const user = await kit.getDiscordUserByName("takasumi");
   * ```
   */
  getDiscordUserByName(name: string): Promise<DiscordUserSearchResponse>;

  /**
   * Fetches the transaction history of a company (`GET /v3/companyHistory/{id}`).
   *
   * @param id - Company id.
   * @returns The company transactions, oldest first.
   * @throws {TakasumiBotKitValidationError} When `id` is empty or blank.
   * @throws {TakasumiBotKitHttpError} When the API answers with a non 2xx status.
   * @throws {TakasumiBotKitNetworkError} When the network fails.
   * @throws {TakasumiBotKitTimeoutError} When the request exceeds `timeoutMs`.
   * @throws {TakasumiBotKitResponseParseError} When a 2xx body is invalid.
   * @throws {TakasumiBotKitRetryLimitError} When retries are exhausted.
   *
   * @example
   * ```ts
   * const history = await kit.getCompanyHistoryById("Abc123Xyz0");
   * ```
   */
  getCompanyHistoryById(id: string): Promise<CompanyHistoryEntry[]>;

  /**
   * Fetches the bot status history (`GET /v3/status/`).
   *
   * @returns The status samples, oldest first.
   * @throws {TakasumiBotKitHttpError} When the API answers with a non 2xx status.
   * @throws {TakasumiBotKitNetworkError} When the network fails.
   * @throws {TakasumiBotKitTimeoutError} When the request exceeds `timeoutMs`.
   * @throws {TakasumiBotKitResponseParseError} When a 2xx body is invalid.
   * @throws {TakasumiBotKitRetryLimitError} When retries are exhausted.
   *
   * @example
   * ```ts
   * const status = await kit.getStatus();
   * ```
   */
  getStatus(): Promise<StatusEntry[]>;

  /**
   * Fluent entry point of the client side Stock helpers. No request is made
   * until a terminal method is awaited.
   *
   * @returns A lazy, immutable builder.
   * @throws {TakasumiBotKitValidationError} From `.id()` when the code is blank.
   *
   * @example
   * ```ts
   * await kit.getStock().id("JTTI").price();
   * ```
   */
  getStock(): StockBuilder;

  /**
   * Resolves one stock from the `GET /v3/stock/` list, without any extra HTTP
   * request.
   *
   * @param id - Stock code, e.g. `"JTTI"`.
   * @returns The matching stock entry.
   * @throws {TakasumiBotKitValidationError} With code `INVALID_STOCK_ID` or
   *   `STOCK_NOT_FOUND`. Never retried.
   * @throws {TakasumiBotKitHttpError} When the underlying list request fails.
   *
   * @example
   * ```ts
   * const stock = await kit.getStockInfoById("JTTI");
   * ```
   */
  getStockInfoById(id: string): Promise<StockEntry>;

  /**
   * Returns the latest price of one stock, or `null` when its history is empty.
   *
   * @param id - Stock code, e.g. `"JTTI"`.
   * @returns The newest price, or `null` when the history is empty.
   * @throws {TakasumiBotKitValidationError} When `id` is blank or unknown.
   * @throws {TakasumiBotKitHttpError} When the underlying list request fails.
   *
   * @example
   * ```ts
   * const price = await kit.getStockPriceById("JTTI");
   * ```
   */
  getStockPriceById(id: string): Promise<bigint | null>;

  /**
   * Returns the price history of one stock, newest first.
   *
   * @param id - Stock code, e.g. `"JTTI"`.
   * @param options - Optional `limit` (see {@link StockHistoryOptions}).
   * @returns The price history, newest first.
   * @throws {TakasumiBotKitValidationError} With code `INVALID_LIMIT` when
   *   `options.limit` is negative, `NaN` or not an integer.
   * @throws {TakasumiBotKitHttpError} When the underlying list request fails.
   *
   * @example
   * ```ts
   * await kit.getStockHistoryById("JTTI", { limit: 3 }); // [103n, 102n, 101n]
   * ```
   */
  getStockHistoryById(id: string, options?: StockHistoryOptions): Promise<bigint[]>;
}

/** Options of the stock history helpers. */
export interface StockHistoryOptions {
  /**
   * Number of prices to return (counted from the newest).
   *
   * - omitted / `undefined` → the whole history
   * - `0` → `[]`
   * - negative, `NaN` or non integer → `TakasumiBotKitValidationError`
   */
  readonly limit?: number;
}
