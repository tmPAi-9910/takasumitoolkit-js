import type { StockHistoryOptions } from "../client/types";
import { getRecentStockHistory } from "../helpers";
import { getStockInfoById } from "./getStockInfoById";
import type { StockListProvider } from "./cache";

/**
 * Returns the price history of one stock, newest first.
 *
 * No additional HTTP request is performed: the history comes from the
 * `prices` array of `GET /v3/stock/`, which is ascending in time (q1) and is
 * therefore reversed here.
 *
 * `limit` rules:
 *
 * - omitted → the whole history
 * - `0` → `[]`
 * - negative, `NaN` or non integer → {@link TakasumiBotKitValidationError}
 * - larger than the history → the whole history
 *
 * @param getStockList - Provider of the stock list (cached or not).
 * @param id - Stock code, e.g. `"JTTI"`.
 * @param options - Optional `limit`.
 * @returns The price history, newest first.
 * @throws {TakasumiBotKitValidationError} With code `INVALID_LIMIT` when
 *   `options.limit` is invalid, or `STOCK_NOT_FOUND` / `INVALID_STOCK_ID` for a
 *   bad `id`.
 *
 * @example
 * ```ts
 * await kit.getStockHistoryById("JTTI", { limit: 3 }); // [103n, 102n, 101n]
 * ```
 */
export async function getStockHistoryById(
  getStockList: StockListProvider,
  id: string,
  options?: StockHistoryOptions,
): Promise<bigint[]> {
  const stock = await getStockInfoById(getStockList, id);
  return getRecentStockHistory(stock.prices, options?.limit);
}
