import { taxResponseSchema } from "../schemas";
import type { TaxResponse } from "../schemas";
import { request, type RequestContext } from "./fetcher";
import { API_PATHS } from "./paths";

/**
 * Fetches every tax rate and interest rate (`GET /v3/tax/`).
 *
 * @param context - Resolved client configuration (provided by `createKitClient`).
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
 * console.log(tax.incomeTaxRate, tax.idleTax); // number, bigint
 * ```
 */
export async function getTaxInfo(context: RequestContext): Promise<TaxResponse> {
  return request(context, { method: "GET", path: API_PATHS.tax, schema: taxResponseSchema });
}
