import { requireGiftId } from "../internal/validate";
import { giftResponseSchema } from "../schemas";
import type { GiftResponse } from "../schemas";
import { request, type RequestContext } from "./fetcher";
import { API_PATHS, buildPath } from "./paths";

/**
 * Fetches information about one gift code (`GET /v3/gift/{id}`).
 *
 * The gift code is validated client side with `/^[A-Za-z0-9]{10}$/` before any
 * request is made (fail fast).
 *
 * @param context - Resolved client configuration (provided by `createKitClient`).
 * @param id - Gift code, exactly 10 alphanumeric characters.
 * @returns The gift information.
 * @throws {TakasumiBotKitValidationError} When `id` is not 10 alphanumeric characters.
 * @throws {TakasumiBotKitHttpError} When the API answers with a non 2xx status
 *   (404 for an unknown gift, for example).
 * @throws {TakasumiBotKitNetworkError} When the network fails.
 * @throws {TakasumiBotKitTimeoutError} When the request exceeds `timeoutMs`.
 * @throws {TakasumiBotKitResponseParseError} When a 2xx body is invalid.
 * @throws {TakasumiBotKitRetryLimitError} When retries are exhausted.
 *
 * @example
 * ```ts
 * const gift = await kit.getGiftInfo("Abc123Xyz0");
 * console.log(gift.amount); // bigint
 * ```
 */
export async function getGiftInfo(context: RequestContext, id: string): Promise<GiftResponse> {
  const giftId = requireGiftId(id);
  return request(context, {
    method: "GET",
    path: buildPath(API_PATHS.giftById, { id: giftId }),
    schema: giftResponseSchema,
  });
}
