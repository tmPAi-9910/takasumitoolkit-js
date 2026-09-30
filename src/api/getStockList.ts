import { stockListResponseSchema } from "../schemas";
import type { StockEntry } from "../schemas";
import { request, type RequestContext } from "./fetcher";
import { API_PATHS } from "./paths";

/**
 * Fetches the whole stock list (`GET /v3/stock/`).
 *
 * This is the **only** stock endpoint of the OpenAPI document; every other
 * stock helper of this SDK derives its result from this list and performs no
 * extra HTTP request.
 *
 * @param context - Resolved client configuration (provided by `createKitClient`).
 * @returns Every listed stock. `prices` is ascending in time (its last element
 *   is the newest price) and every `int64` value is a `bigint`.
 * @throws {TakasumiBotKitHttpError} When the API answers with a non 2xx status.
 * @throws {TakasumiBotKitNetworkError} When the network fails.
 * @throws {TakasumiBotKitTimeoutError} When the request exceeds `timeoutMs`.
 * @throws {TakasumiBotKitResponseParseError} When a 2xx body is invalid.
 * @throws {TakasumiBotKitRetryLimitError} When retries are exhausted.
 *
 * @example
 * ```ts
 * const stocks = await kit.getStockList();
 * console.log(stocks.map((stock) => stock.id));
 * ```
 */
export async function getStockList(context: RequestContext): Promise<StockEntry[]> {
  return request(context, {
    method: "GET",
    path: API_PATHS.stockList,
    schema: stockListResponseSchema,
  });
}
