import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BASE_URL_ENV_KEY,
  DEFAULT_BASE_URL,
  normalizeBaseUrl,
  readBaseUrlFromEnv,
  resolveBaseUrl,
} from "../../../src/client/baseUrl";
import { joinUrl, stripTrailingSlash } from "../../../src/internal/url";

describe("baseUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to servers[0].url of the OpenAPI document", () => {
    expect(DEFAULT_BASE_URL).toBe("https://api.takasumibot.com/");
    expect(resolveBaseUrl()).toBe("https://api.takasumibot.com");
  });

  it("prefers TAKASUMIBOT_BASE_URL when set", () => {
    vi.stubEnv(BASE_URL_ENV_KEY, "https://example.test/api/");
    expect(readBaseUrlFromEnv()).toBe("https://example.test/api/");
    expect(resolveBaseUrl()).toBe("https://example.test/api");
  });

  it("ignores a blank TAKASUMIBOT_BASE_URL", () => {
    vi.stubEnv(BASE_URL_ENV_KEY, "   ");
    expect(readBaseUrlFromEnv()).toBeUndefined();
    expect(resolveBaseUrl()).toBe("https://api.takasumibot.com");
  });

  it("removes every trailing slash when normalising", () => {
    expect(normalizeBaseUrl("https://api.takasumibot.com///")).toBe("https://api.takasumibot.com");
    expect(stripTrailingSlash("/v3/tax/")).toBe("/v3/tax");
  });

  it("joins baseUrl and path without duplicate or trailing slashes", () => {
    expect(joinUrl("https://api.takasumibot.com", "/v3/tax/")).toBe(
      "https://api.takasumibot.com/v3/tax",
    );
    expect(joinUrl("https://api.takasumibot.com/", "/v3/gift/Abc123Xyz0")).toBe(
      "https://api.takasumibot.com/v3/gift/Abc123Xyz0",
    );
    expect(joinUrl("https://api.takasumibot.com/", "/")).toBe("https://api.takasumibot.com");
  });
});
