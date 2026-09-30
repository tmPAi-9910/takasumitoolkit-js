import { afterEach, describe, expect, it, vi } from "vitest";
import { createKitClient } from "../../../src/client/createKitClient";
import { TakasumiBotKitConfigError } from "../../../src/errors";
import { createMockFetch } from "../../helpers/mockFetch";
import { taxResponse } from "../../helpers/fixtures";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("createKitClient", () => {
  it("applies the documented defaults", () => {
    const fetch = createMockFetch([{ body: taxResponse }]);
    const kit = createKitClient({ fetch });
    expect(kit.baseUrl).toBe("https://api.takasumibot.com");
    expect(kit.helpers.truncate).toBeTypeOf("function");
  });

  it("exposes baseUrl as read-only", () => {
    const kit = createKitClient({ fetch: createMockFetch([{ body: taxResponse }]) });
    expect(() => {
      // @ts-expect-error -- baseUrl is readonly on purpose
      kit.baseUrl = "https://evil.test";
    }).toThrowError();
    expect(kit.baseUrl).toBe("https://api.takasumibot.com");
  });

  it("uses TAKASUMIBOT_BASE_URL for the requests", async () => {
    vi.stubEnv("TAKASUMIBOT_BASE_URL", "https://example.test/root/");
    const fetch = createMockFetch([{ body: taxResponse }]);
    const kit = createKitClient({ fetch });
    expect(kit.baseUrl).toBe("https://example.test/root");

    await kit.getTaxInfo();
    expect(fetch.lastUrl).toBe("https://example.test/root/v3/tax");
  });

  it("merges custom headers into every request (user headers win)", async () => {
    const fetch = createMockFetch([{ body: taxResponse }]);
    const kit = createKitClient({ fetch, headers: { "user-agent": "my-bot/1.0" } });

    await kit.getTaxInfo();
    expect(fetch.calls[0]?.init?.headers).toMatchObject({
      "user-agent": "my-bot/1.0",
      accept: "application/json",
    });
  });

  it("rejects an invalid timeoutMs", () => {
    expect(() => createKitClient({ timeoutMs: 0 })).toThrowError(TakasumiBotKitConfigError);
    expect(() => createKitClient({ timeoutMs: -1 })).toThrowError(TakasumiBotKitConfigError);
    expect(() => createKitClient({ timeoutMs: Number.NaN })).toThrowError(
      TakasumiBotKitConfigError,
    );
  });

  it("rejects invalid retry settings", () => {
    expect(() => createKitClient({ retry: { maxRetries: -1 } })).toThrowError(
      TakasumiBotKitConfigError,
    );
    expect(() => createKitClient({ retry: { maxRetries: 1.5 } })).toThrowError(
      TakasumiBotKitConfigError,
    );
    expect(() => createKitClient({ retry: { backoffFactor: 0 } })).toThrowError(
      TakasumiBotKitConfigError,
    );
    expect(() => createKitClient({ retry: { jitter: "yes" as unknown as boolean } })).toThrowError(
      TakasumiBotKitConfigError,
    );
  });

  it("throws a ConfigError when initialDelayMs > maxDelayMs", () => {
    expect(() =>
      createKitClient({ retry: { initialDelayMs: 5000, maxDelayMs: 1000 } }),
    ).toThrowError(TakasumiBotKitConfigError);
  });

  it("rejects an invalid fetch, headers, logger and stockCache", () => {
    expect(() => createKitClient({ fetch: "nope" as never })).toThrowError(
      TakasumiBotKitConfigError,
    );
    expect(() => createKitClient({ headers: [] as never })).toThrowError(TakasumiBotKitConfigError);
    expect(() => createKitClient({ logger: { warn: "nope" as never } })).toThrowError(
      TakasumiBotKitConfigError,
    );
    expect(() => createKitClient({ stockCache: { ttlMs: 0 } })).toThrowError(
      TakasumiBotKitConfigError,
    );
    expect(() => createKitClient({ stockCache: { ttlMs: -5 } })).toThrowError(
      TakasumiBotKitConfigError,
    );
    expect(() => createKitClient({ stockCache: true as never })).toThrowError(
      TakasumiBotKitConfigError,
    );
  });

  it("exposes the error field when the configuration is invalid", () => {
    try {
      createKitClient({ timeoutMs: -1 });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(TakasumiBotKitConfigError);
      const configError = error as TakasumiBotKitConfigError;
      expect(configError.field).toBe("timeoutMs");
      expect(configError.value).toBe(-1);
      expect(configError.retryable).toBe(false);
    }
  });

  it("does not fire any request when only the builder is created", () => {
    const fetch = createMockFetch([{ body: [] }]);
    const kit = createKitClient({ fetch });
    const builder = kit.getStock().id("JTTI");
    expect(builder).toBeDefined();
    expect(fetch.callCount).toBe(0);
  });
});
