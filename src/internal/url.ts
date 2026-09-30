/**
 * Removes every trailing slash from `value`.
 *
 * The OpenAPI document defines its paths with a trailing slash (`/v3/tax/`),
 * while `servers[0].url` also ends with one. Both are normalised before being
 * joined so that no double or trailing slash ever reaches the wire.
 *
 * @param value - URL or path to normalise.
 * @returns `value` without trailing slashes.
 *
 * @example
 * ```ts
 * stripTrailingSlash("/v3/tax/"); // "/v3/tax"
 * stripTrailingSlash("https://api.takasumibot.com/"); // "https://api.takasumibot.com"
 * ```
 */
export function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

/**
 * Joins an already normalised base URL with a request path.
 *
 * Trailing slashes are removed from both parts (the leading slash of `path` is
 * kept logically by re-inserting a single separator).
 *
 * @param baseUrl - Base URL, e.g. `https://api.takasumibot.com`.
 * @param path - Request path, e.g. `/v3/tax/`.
 * @returns The joined URL, e.g. `https://api.takasumibot.com/v3/tax`.
 *
 * @throws {TypeError} When `path` is empty.
 *
 * @example
 * ```ts
 * joinUrl("https://api.takasumibot.com", "/v3/tax/"); // "https://api.takasumibot.com/v3/tax"
 * ```
 */
export function joinUrl(baseUrl: string, path: string): string {
  const normalizedBase = stripTrailingSlash(baseUrl);
  const normalizedPath = stripTrailingSlash(path);
  if (normalizedPath.length === 0) {
    return normalizedBase;
  }
  return `${normalizedBase}/${normalizedPath.replace(/^\/+/, "")}`;
}

/**
 * Percent-encodes a value so that it is safe inside a URL path segment.
 *
 * @param value - Raw path parameter value.
 * @returns The encoded segment.
 *
 * @example
 * ```ts
 * encodePathSegment("a/b"); // "a%2Fb"
 * ```
 */
export function encodePathSegment(value: string): string {
  return encodeURIComponent(value);
}
