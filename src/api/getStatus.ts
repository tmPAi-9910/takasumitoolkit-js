import { statusResponseSchema } from "../schemas";
import type { StatusEntry } from "../schemas";
import { request, type RequestContext } from "./fetcher";
import { API_PATHS } from "./paths";

/**
 * Fetches the bot status history (`GET /v3/status/`).
 *
 * @param context - Resolved client configuration (provided by `createKitClient`).
 * @returns The status samples, oldest first.
 * @throws {TakasumiBotKitHttpError} When the API answers with a non 2xx status.
 * @throws {TakasumiBotKitNetworkError} When the network fails.
 * @throws {TakasumiBotKitTimeoutError} When the request exceeds `timeoutMs`.
 * @throws {TakasumiBotKitResponseParseError} When a 2xx body is invalid.
 * @throws {TakasumiBotKitRetryLimitError} When retries are exhausted.
 *
 * @example
 * ```ts
 * const status = await kit.getStatus();
 * console.log(status.at(-1)?.ping);
 * ```
 */
export async function getStatus(context: RequestContext): Promise<StatusEntry[]> {
  return request(context, { method: "GET", path: API_PATHS.status, schema: statusResponseSchema });
}
