import { afterEach, describe, expect, it, vi } from "vitest";
import { createKitClient } from "../../../src/client/createKitClient";
import {
  TakasumiBotKitHttpError,
  TakasumiBotKitNetworkError,
  TakasumiBotKitResponseParseError,
  TakasumiBotKitRetryLimitError,
  TakasumiBotKitTimeoutError,
} from "../../../src/errors";
import { createMockFetch, hangUntilAbort } from "../../helpers/mockFetch";
import { discordUserSearchResponse, taxResponse } from "../../helpers/fixtures";

afterEach(() => {
  vi.useRealTimers();
});

describe("fetcher", () => {
  it("strips the trailing slash of the path and validates the body", async () => {
    const fetch = createMockFetch([{ body: taxResponse }]);
    const kit = createKitClient({ fetch });

    const tax = await kit.getTaxInfo();
    expect(fetch.calls[0]?.url).toBe("https://api.takasumibot.com/v3/tax");
    expect(fetch.calls[0]?.init?.method).toBe("GET");
    expect(tax.idleTax).toBe(50000n);
    expect(tax.incomeTaxRate).toBe(0.15);
  });

  it("sends the request with an abort signal", async () => {
    const fetch = createMockFetch([{ body: taxResponse }]);
    const kit = createKitClient({ fetch });
    await kit.getTaxInfo();
    expect(fetch.calls[0]?.init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("URL-encodes path parameters", async () => {
    const fetch = createMockFetch([{ body: discordUserSearchResponse }]);
    const kit = createKitClient({ fetch });
    await kit.getDiscordUserByName("user name");
    expect(fetch.lastUrl).toBe("https://api.takasumibot.com/v3/discord/usersearch/user%20name");
  });

  it("turns a timeout into a TakasumiBotKitTimeoutError", async () => {
    vi.useFakeTimers();
    const fetch = createMockFetch([hangUntilAbort()]);
    const kit = createKitClient({ fetch, timeoutMs: 1000, retry: { maxRetries: 0 } });

    const settled = kit.getTaxInfo().then(
      () => undefined,
      (thrown: unknown) => thrown,
    );
    await vi.advanceTimersByTimeAsync(1000);

    const error = await settled;
    expect(error).toBeInstanceOf(TakasumiBotKitTimeoutError);
    expect(error).toMatchObject({
      url: "https://api.takasumibot.com/v3/tax",
      timeoutMs: 1000,
      retryable: true,
    });
  });

  it("turns a fetch rejection into a TakasumiBotKitNetworkError", async () => {
    const fetch = createMockFetch([new TypeError("fetch failed")]);
    const kit = createKitClient({ fetch, retry: { maxRetries: 0 } });

    const error = await kit.getTaxInfo().catch((thrown: unknown) => thrown);
    expect(error).toBeInstanceOf(TakasumiBotKitNetworkError);
    expect(error).toMatchObject({ url: "https://api.takasumibot.com/v3/tax", method: "GET" });
    expect((error as TakasumiBotKitNetworkError).retryable).toBe(true);
  });

  it("does not retry a 404 and exposes the status", async () => {
    const fetch = createMockFetch([{ status: 404, statusText: "Not Found", body: {} }]);
    const kit = createKitClient({ fetch });

    const error = await kit.getGiftInfo("Abc123Xyz0").catch((thrown: unknown) => thrown);
    expect(error).toBeInstanceOf(TakasumiBotKitHttpError);
    expect(error).toMatchObject({ status: 404, statusText: "Not Found" });
    expect((error as TakasumiBotKitHttpError).retryable).toBe(false);
    expect(fetch.callCount).toBe(1);
  });

  it("retries 5xx and throws a RetryLimitError when exhausted", async () => {
    vi.useFakeTimers();
    const fetch = createMockFetch([{ status: 500, body: {} }]);
    const kit = createKitClient({
      fetch,
      retry: { maxRetries: 2, initialDelayMs: 10, maxDelayMs: 20, jitter: false },
    });

    const pending = kit.getTaxInfo();
    const settled = pending.catch((thrown: unknown) => thrown);
    await vi.advanceTimersByTimeAsync(1000);

    const error = await settled;
    expect(error).toBeInstanceOf(TakasumiBotKitRetryLimitError);
    expect(error).toMatchObject({ attempts: 3, maxRetries: 2 });
    expect((error as TakasumiBotKitRetryLimitError).lastError).toBeInstanceOf(
      TakasumiBotKitHttpError,
    );
    expect(fetch.callCount).toBe(3);
  });

  it("keeps an unparsable 5xx body as an HttpError (HttpError priority)", async () => {
    const fetch = createMockFetch([
      { status: 503, rawBody: "<html>upstream down</html>", statusText: "Service Unavailable" },
    ]);
    const kit = createKitClient({ fetch, retry: { maxRetries: 0 } });

    const error = await kit.getTaxInfo().catch((thrown: unknown) => thrown);
    expect(error).toBeInstanceOf(TakasumiBotKitHttpError);
    expect(error).not.toBeInstanceOf(TakasumiBotKitResponseParseError);
    expect(error).toMatchObject({ status: 503, rawBody: "<html>upstream down</html>" });
  });

  it("throws a ResponseParseError when a 2xx body is not JSON", async () => {
    const fetch = createMockFetch([{ status: 200, rawBody: "not json" }]);
    const kit = createKitClient({ fetch });

    const error = await kit.getTaxInfo().catch((thrown: unknown) => thrown);
    expect(error).toBeInstanceOf(TakasumiBotKitResponseParseError);
    expect(error).toMatchObject({ status: 200, rawBody: "not json" });
  });

  it("throws a ResponseParseError with zod issues when the schema does not match", async () => {
    const fetch = createMockFetch([{ status: 200, body: { nope: true } }]);
    const kit = createKitClient({ fetch });

    const error = await kit.getTaxInfo().catch((thrown: unknown) => thrown);
    expect(error).toBeInstanceOf(TakasumiBotKitResponseParseError);
    const parseError = error as TakasumiBotKitResponseParseError;
    expect(parseError.zodIssues?.length).toBeGreaterThan(0);
    expect(parseError.cause).toBeDefined();
  });

  it("extracts code and requestId on a best effort basis", async () => {
    const fetch = createMockFetch([
      {
        status: 429,
        statusText: "Too Many Requests",
        body: { code: "RATE_LIMITED", requestId: "req-1" },
        headers: { "retry-after": "1" },
      },
    ]);
    const kit = createKitClient({ fetch, retry: { maxRetries: 0 } });

    const error = await kit.getTaxInfo().catch((thrown: unknown) => thrown);
    const httpError = error as TakasumiBotKitHttpError;
    expect(httpError.code).toBe("RATE_LIMITED");
    expect(httpError.requestId).toBe("req-1");
    expect(httpError.retryAfter).toBe("1");
    expect(httpError.retryable).toBe(true);
  });

  it("prefers the x-request-id header over the body", async () => {
    const fetch = createMockFetch([
      {
        status: 500,
        body: { requestId: "from-body" },
        headers: { "x-request-id": "from-header" },
      },
    ]);
    const kit = createKitClient({ fetch, retry: { maxRetries: 0 } });

    const error = await kit.getTaxInfo().catch((thrown: unknown) => thrown);
    expect((error as TakasumiBotKitHttpError).requestId).toBe("from-header");
  });

  it("passes unknown fields through instead of stripping them", async () => {
    const fetch = createMockFetch([{ body: { ...taxResponse, brandNewField: "kept" } }]);
    const kit = createKitClient({ fetch });

    const tax = await kit.getTaxInfo();
    expect(tax).toMatchObject({ idleTax: 50000n });
    expect((tax as Record<string, unknown>)["brandNewField"]).toBe("kept");
  });

  it("logs debug messages when a logger is provided", async () => {
    const debug = vi.fn();
    const fetch = createMockFetch([{ body: taxResponse }]);
    const kit = createKitClient({ fetch, logger: { debug } });

    await kit.getTaxInfo();
    expect(debug).toHaveBeenCalledTimes(1);
  });
});
