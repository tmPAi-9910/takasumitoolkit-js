import type { paths } from "../generated/openapi";
import { TakasumiBotKitValidationError } from "../errors";
import { encodePathSegment } from "../internal/url";

/**
 * Every HTTP path declared in `TakasumiBOT-OpenAPI-Document.json`.
 *
 * The `satisfies` clause is a compile time guard: inventing a path (or
 * misspelling one) is a type error, so the SDK can never call an endpoint that
 * the OpenAPI document does not declare.
 */
export type ApiPathTemplate = Extract<keyof paths, string>;

/**
 * Path templates used by this SDK, exactly as declared in the OpenAPI document
 * (trailing slashes included — they are stripped when the URL is built).
 *
 * `/v3/realtime/` is a WebSocket endpoint and is deliberately absent.
 */
export const API_PATHS = {
  giftById: "/v3/gift/{id}",
  tax: "/v3/tax/",
  shard: "/v3/shard/",
  statistics: "/v3/statistics/",
  historyById: "/v3/history/{id}",
  profileById: "/v3/profile/{id}",
  ranking: "/v3/ranking/",
  companyList: "/v3/companylist/",
  companyById: "/v3/company/{id}",
  stockList: "/v3/stock/",
  discordUserByName: "/v3/discord/usersearch/{name}",
  companyHistoryById: "/v3/companyHistory/{id}",
  status: "/v3/status/",
} as const satisfies Record<string, ApiPathTemplate>;

/**
 * Substitutes the `{name}` placeholders of a path template.
 *
 * @param template - An OpenAPI path template, e.g. `/v3/gift/{id}`.
 * @param params - Values for the placeholders. Every value is URL encoded.
 * @returns The concrete request path.
 * @throws {TakasumiBotKitValidationError} When a placeholder has no value.
 *
 * @example
 * ```ts
 * buildPath(API_PATHS.giftById, { id: "Abc123Xyz0" }); // "/v3/gift/Abc123Xyz0"
 * ```
 */
export function buildPath(
  template: ApiPathTemplate,
  params: Readonly<Record<string, string>> = {},
): string {
  return template.replace(/\{([^{}]+)\}/g, (_match, name: string) => {
    const value = params[name];
    if (typeof value !== "string") {
      throw new TakasumiBotKitValidationError(`Missing path parameter "${name}"`, {
        field: name,
        code: "INVALID_ARGUMENT",
      });
    }
    return encodePathSegment(value);
  });
}
