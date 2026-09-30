/**
 * Default base URL, taken verbatim from `servers[0].url` of
 * `TakasumiBOT-OpenAPI-Document.json` (`https://api.takasumibot.com/`).
 *
 * It is duplicated as a constant (instead of being read from the generated
 * types) so that the runtime bundle stays free of the generated file.
 */
export const DEFAULT_BASE_URL = "https://api.takasumibot.com/";

/** Name of the environment variable that overrides the base URL. */
export const BASE_URL_ENV_KEY = "TAKASUMIBOT_BASE_URL";

/** Removes every trailing slash from `url`. */
function stripTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Reads the base URL override from `process.env.TAKASUMIBOT_BASE_URL`.
 *
 * Only Node/Bun are supported (q14): when `process` is undefined the default
 * base URL is used.
 *
 * @returns The trimmed environment value, or `undefined` when missing/blank.
 *
 * @example
 * ```ts
 * process.env.TAKASUMIBOT_BASE_URL = "https://example.test/";
 * readBaseUrlFromEnv(); // "https://example.test/"
 * ```
 */
export function readBaseUrlFromEnv(): string | undefined {
  const value =
    typeof process === "object" && process !== null && typeof process.env === "object"
      ? process.env[BASE_URL_ENV_KEY]
      : undefined;
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Normalises a base URL by removing its trailing slashes.
 *
 * @param url - Raw base URL.
 * @returns The base URL without trailing slashes.
 *
 * @example
 * ```ts
 * normalizeBaseUrl("https://api.takasumibot.com/"); // "https://api.takasumibot.com"
 * ```
 */
export function normalizeBaseUrl(url: string): string {
  return stripTrailingSlashes(url);
}

/**
 * Resolves the base URL used by the client.
 *
 * Priority (SPEC §3):
 *
 * 1. `process.env.TAKASUMIBOT_BASE_URL` when set to a non blank string
 * 2. `servers[0].url` of the OpenAPI document
 *
 * In both cases the trailing slash is removed.
 *
 * @returns The normalised base URL.
 *
 * @example
 * ```ts
 * resolveBaseUrl(); // "https://api.takasumibot.com"
 * ```
 */
export function resolveBaseUrl(): string {
  return normalizeBaseUrl(readBaseUrlFromEnv() ?? DEFAULT_BASE_URL);
}
