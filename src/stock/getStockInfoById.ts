import { TakasumiBotKitValidationError } from "../errors";
import { requireStockId } from "../internal/validate";
import type { StockEntry } from "../schemas";
import type { StockListProvider } from "./cache";

/**
 * Resolves one stock from the `GET /v3/stock/` list.
 *
 * No additional HTTP request is performed: the list is fetched once (and cached
 * when `basicConfig.stockCache` is enabled) and searched client side.
 *
 * @param getStockList - Provider of the stock list (cached or not).
 * @param id - Stock code, e.g. `"JTTI"`.
 * @returns The matching stock entry.
 * @throws {TakasumiBotKitValidationError} With code `INVALID_STOCK_ID` when
 *   `id` is blank, or `STOCK_NOT_FOUND` when the code is unknown. Never retried.
 *
 * @example
 * ```ts
 * const stock = await kit.getStockInfoById("JTTI");
 * console.log(stock.name, stock.dividendAmount);
 * ```
 */
export async function getStockInfoById(
  getStockList: StockListProvider,
  id: string,
): Promise<StockEntry> {
  const stockId = requireStockId(id);
  const list = await getStockList();
  const found = list.find((entry) => entry.id === stockId);
  if (found === undefined) {
    throw new TakasumiBotKitValidationError(`Unknown stock id "${stockId}"`, {
      field: "id",
      value: stockId,
      code: "STOCK_NOT_FOUND",
    });
  }
  return found;
}
