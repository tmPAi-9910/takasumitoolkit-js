import { requireNonEmptyString } from "../internal/validate";
import { companyHistoryResponseSchema } from "../schemas";
import type { CompanyHistoryEntry } from "../schemas";
import { request, type RequestContext } from "./fetcher";
import { API_PATHS, buildPath } from "./paths";

/**
 * Fetches the transaction history of a company (`GET /v3/companyHistory/{id}`).
 *
 * @param context - Resolved client configuration (provided by `createKitClient`).
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
 * console.log(history.length);
 * ```
 */
export async function getCompanyHistoryById(
  context: RequestContext,
  id: string,
): Promise<CompanyHistoryEntry[]> {
  const companyId = requireNonEmptyString(id, "id");
  return request(context, {
    method: "GET",
    path: buildPath(API_PATHS.companyHistoryById, { id: companyId }),
    schema: companyHistoryResponseSchema,
  });
}
