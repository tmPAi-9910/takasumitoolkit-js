import { rankingResponseSchema } from "../schemas";
import type { RankingEntry } from "../schemas";
import { request, type RequestContext } from "./fetcher";
import { API_PATHS } from "./paths";

/**
 * Fetches the assets ranking (`GET /v3/ranking/`).
 *
 * @param context - Resolved client configuration (provided by `createKitClient`).
 * @returns The ranking entries (the API currently returns the top 50).
 * @throws {TakasumiBotKitHttpError} When the API answers with a non 2xx status.
 * @throws {TakasumiBotKitNetworkError} When the network fails.
 * @throws {TakasumiBotKitTimeoutError} When the request exceeds `timeoutMs`.
 * @throws {TakasumiBotKitResponseParseError} When a 2xx body is invalid.
 * @throws {TakasumiBotKitRetryLimitError} When retries are exhausted.
 *
 * @example
 * ```ts
 * const ranking = await kit.getRanking();
 * console.log(ranking[0]?.username);
 * ```
 */
export async function getRanking(context: RequestContext): Promise<RankingEntry[]> {
  return request(context, {
    method: "GET",
    path: API_PATHS.ranking,
    schema: rankingResponseSchema,
  });
}
