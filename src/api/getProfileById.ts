import { requireNonEmptyString } from "../internal/validate";
import { profileResponseSchema } from "../schemas";
import type { ProfileResponse } from "../schemas";
import { request, type RequestContext } from "./fetcher";
import { API_PATHS, buildPath } from "./paths";

/**
 * Fetches the profile of a Discord user (`GET /v3/profile/{id}`).
 *
 * @param context - Resolved client configuration (provided by `createKitClient`).
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
 * console.log(profile.assets); // bigint
 * ```
 */
export async function getProfileById(
  context: RequestContext,
  id: string,
): Promise<ProfileResponse> {
  const userId = requireNonEmptyString(id, "id");
  return request(context, {
    method: "GET",
    path: buildPath(API_PATHS.profileById, { id: userId }),
    schema: profileResponseSchema,
  });
}
