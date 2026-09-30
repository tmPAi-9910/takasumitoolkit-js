import type { StockHistoryOptions } from "../client/types";
import { requireStockId } from "../internal/validate";
import type { StockEntry } from "../schemas";
import type { StockListProvider } from "./cache";
import { getStockHistoryById } from "./getStockHistoryById";
import { getStockInfoById } from "./getStockInfoById";
import { getStockPriceById } from "./getStockPriceById";

/** Terminal methods returned by `kit.getStock().id(id)`. */
export interface StockIdBuilder {
  /**
   * Resolves the stock entry from the `GET /v3/stock/` list.
   *
   * @returns The matching stock entry.
   * @throws {TakasumiBotKitValidationError} With code `STOCK_NOT_FOUND`.
   * @throws {TakasumiBotKitHttpError} When the underlying list request fails.
   *
   * @example
   * ```ts
   * const stock = await kit.getStock().id("JTTI").info();
   * ```
   */
  info(): Promise<StockEntry>;

  /**
   * Resolves the newest price of the stock.
   *
   * @returns The newest price, or `null` when the history is empty.
   * @throws {TakasumiBotKitValidationError} With code `STOCK_NOT_FOUND`.
   * @throws {TakasumiBotKitHttpError} When the underlying list request fails.
   *
   * @example
   * ```ts
   * const price = await kit.getStock().id("JTTI").price(); // bigint | null
   * ```
   */
  price(): Promise<bigint | null>;

  /**
   * Resolves the price history of the stock, newest first.
   *
   * @param options - Optional `limit` (see `StockHistoryOptions`).
   * @returns The price history, newest first.
   * @throws {TakasumiBotKitValidationError} With code `INVALID_LIMIT` or
   *   `STOCK_NOT_FOUND`.
   * @throws {TakasumiBotKitHttpError} When the underlying list request fails.
   *
   * @example
   * ```ts
   * await kit.getStock().id("JTTI").history({ limit: 3 }); // [103n, 102n, 101n]
   * ```
   */
  history(options?: StockHistoryOptions): Promise<bigint[]>;
}

/**
 * Fluent entry point of the Stock helpers.
 *
 * @example
 * ```ts
 * await kit.getStock().id("JTTI").price();
 * ```
 */
export interface StockBuilder {
  /**
   * Binds a stock code and returns the terminal methods.
   *
   * The code is validated immediately (fail fast) and no request is made.
   *
   * @param id - Stock code, e.g. `"JTTI"`.
   * @returns The `info()` / `price()` / `history()` methods.
   * @throws {TakasumiBotKitValidationError} With code `INVALID_STOCK_ID` when
   *   `id` is empty or blank.
   *
   * @example
   * ```ts
   * await kit.getStock().id("JTTI").price();
   * ```
   */
  id(id: string): StockIdBuilder;
}

/**
 * Creates the `kit.getStock()` builder.
 *
 * The builder is lazy and immutable: `getStock()` and `.id()` never perform a
 * request; the first awaited terminal method does (and reuses the cached list
 * when `basicConfig.stockCache` is enabled).
 *
 * @param getStockList - Provider of the stock list (cached or not).
 * @returns A new {@link StockBuilder}.
 *
 * @example
 * ```ts
 * const builder = createStockBuilder(() => kit.getStockList());
 * const price = await builder.id("JTTI").price();
 * ```
 */
export function createStockBuilder(getStockList: StockListProvider): StockBuilder {
  return {
    id(id: string): StockIdBuilder {
      const stockId = requireStockId(id);
      return {
        info: () => getStockInfoById(getStockList, stockId),
        price: () => getStockPriceById(getStockList, stockId),
        history: (options?: StockHistoryOptions) =>
          getStockHistoryById(getStockList, stockId, options),
      };
    },
  };
}
