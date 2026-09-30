import { requireNonEmptyString } from "../internal/validate";
import { companyDetailResponseSchema } from "../schemas";
import type { CompanyDetailResponse } from "../schemas";
import { request, type RequestContext } from "./fetcher";
import { API_PATHS, buildPath } from "./paths";

/**
 * Fetches the detail of one company (`GET /v3/company/{id}`).
 *
 * @param context - Resolved client configuration (provided by `createKitClient`).
 * @param id - Company id (10 characters) **or** the Discord user id of its owner.
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
 * console.log(company.employees.length, company.statistics.totalEarn);
 * ```
 */
export async function getCompanyById(
  context: RequestContext,
  id: string,
): Promise<CompanyDetailResponse> {
  const companyId = requireNonEmptyString(id, "id");
  return request(context, {
    method: "GET",
    path: buildPath(API_PATHS.companyById, { id: companyId }),
    schema: companyDetailResponseSchema,
  });
}
