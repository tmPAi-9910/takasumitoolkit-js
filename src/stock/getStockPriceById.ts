import type { StockEntry } from "../schemas";
import { getStockInfoById } from "./getStockInfoById";
import type { StockListProvider } from "./cache";

/**
 * Returns the latest price of one stock.
 *
 * `prices` is ascending in time, so the newest price is its last element (q1).
 * When the stock has no price history `null` is returned instead of throwing
 * (q3) — an empty history is not an error.
 *
 * @param getStockList - Provider of the stock list (cached or not).
 * @param id - Stock code, e.g. `"JTTI"`.
 * @returns The newest price, or `null` when the history is empty.
 * @throws {TakasumiBotKitValidationError} When `id` is blank or unknown.
 *
 * @example
 * ```ts
 * const price = await kit.getStockPriceById("JTTI");
 * if (price !== null) console.log(price.toString());
 * ```
 */
export async function getStockPriceById(
  getStockList: StockListProvider,
  id: string,
): Promise<bigint | null> {
  const stock: StockEntry = await getStockInfoById(getStockList, id);
  return stock.prices.at(-1) ?? null;
}
