import { afterEach, describe, expect, it, vi } from "vitest";
import { createKitClient } from "../../../src/client/createKitClient";
import {
  TakasumiBotKitError,
  TakasumiBotKitHttpError,
  TakasumiBotKitNetworkError,
  TakasumiBotKitRetryLimitError,
  TakasumiBotKitTimeoutError,
  TakasumiBotKitValidationError,
} from "../../../src/errors";
import { isRetryableError } from "../../../src/retry/isRetryable";
import { createMockFetch, hangUntilAbort } from "../../helpers/mockFetch";
import { taxResponse } from "../../helpers/fixtures";

const fastRetry = {
  maxRetries: 3,
  initialDelayMs: 1,
  maxDelayMs: 5,
  backoffFactor: 2,
  jitter: false,
};

afterEach(() => {
  vi.useRealTimers();
});

describe("isRetryableError", () => {
  const context = { url: "https://api.takasumibot.com/v3/tax", method: "GET" };

  it("retries network errors and timeouts", () => {
    expect(isRetryableError(new TakasumiBotKitNetworkError("boom", context))).toBe(true);
    expect(isRetryableError(new TakasumiBotKitTimeoutError({ timeoutMs: 1, ...context }))).toBe(
      true,
    );
  });

  it("retries 429, 500, 502, 503 and 504 only", () => {
    for (const status of [429, 500, 502, 503, 504]) {
      expect(isRetryableError(new TakasumiBotKitHttpError({ status, ...context }))).toBe(true);
    }
    for (const status of [400, 401, 403, 404, 409, 422]) {
      expect(isRetryableError(new TakasumiBotKitHttpError({ status, ...context }))).toBe(false);
    }
  });

  it("never retries validation, configuration or parse errors", () => {
    expect(isRetryableError(new TakasumiBotKitValidationError("bad"))).toBe(false);
    expect(isRetryableError(new TakasumiBotKitError("other"))).toBe(false);
    expect(isRetryableError(new Error("plain"))).toBe(false);
  });
});

describe("withRetry", () => {
  it("does not retry a successful call", async () => {
    const fetch = createMockFetch([{ body: taxResponse }]);
    const kit = createKitClient({ fetch, retry: fastRetry });

    await kit.getTaxInfo();
    expect(fetch.callCount).toBe(1);
  });

  it("retries 503 until it succeeds", async () => {
    vi.useFakeTimers();
    const fetch = createMockFetch([
      { status: 503, body: {} },
      { status: 500, body: {} },
      { status: 200, body: taxResponse },
    ]);
    const kit = createKitClient({ fetch, retry: fastRetry });

    const settled = kit.getTaxInfo().then(
      (value) => value,
      (thrown: unknown) => thrown,
    );
    await vi.advanceTimersByTimeAsync(1000);

    expect(await settled).toMatchObject({ idleTax: 50000n });
    expect(fetch.callCount).toBe(3);
  });

  it("does not retry a 400", async () => {
    const fetch = createMockFetch([{ status: 400, body: {} }]);
    const kit = createKitClient({ fetch, retry: fastRetry });

    const error = await kit.getTaxInfo().catch((thrown: unknown) => thrown);
    expect(error).toBeInstanceOf(TakasumiBotKitHttpError);
    expect(fetch.callCount).toBe(1);
  });

  it("does not retry when maxRetries is 0 and rethrows the original error", async () => {
    const fetch = createMockFetch([new Error("offline")]);
    const kit = createKitClient({ fetch, retry: { ...fastRetry, maxRetries: 0 } });

    const error = await kit.getTaxInfo().catch((thrown: unknown) => thrown);
    expect(error).toBeInstanceOf(TakasumiBotKitNetworkError);
    expect(error).not.toBeInstanceOf(TakasumiBotKitRetryLimitError);
    expect(fetch.callCount).toBe(1);
  });

  it("throws a RetryLimitError carrying the last error when exhausted", async () => {
    vi.useFakeTimers();
    const fetch = createMockFetch([new Error("offline")]);
    const kit = createKitClient({ fetch, retry: { ...fastRetry, maxRetries: 2 } });

    const settled = kit.getTaxInfo().then(
      () => undefined,
      (thrown: unknown) => thrown,
    );
    await vi.advanceTimersByTimeAsync(1000);

    const error = (await settled) as TakasumiBotKitRetryLimitError;
    expect(error).toBeInstanceOf(TakasumiBotKitRetryLimitError);
    expect(error.attempts).toBe(3);
    expect(error.maxRetries).toBe(2);
    expect(error.lastError).toBeInstanceOf(TakasumiBotKitNetworkError);
    expect(error.cause).toBe(error.lastError);
    expect(error.retryable).toBe(false);
    expect(fetch.callCount).toBe(3);
  });

  it("retries timeouts as well", async () => {
    vi.useFakeTimers();
    const fetch = createMockFetch([hangUntilAbort()]);
    const kit = createKitClient({
      fetch,
      timeoutMs: 100,
      retry: { ...fastRetry, maxRetries: 1 },
    });

    const settled = kit.getTaxInfo().then(
      () => undefined,
      (thrown: unknown) => thrown,
    );
    await vi.advanceTimersByTimeAsync(10_000);

    const error = (await settled) as TakasumiBotKitRetryLimitError;
    expect(error).toBeInstanceOf(TakasumiBotKitRetryLimitError);
    expect(error.lastError).toBeInstanceOf(TakasumiBotKitTimeoutError);
    expect(fetch.callCount).toBe(2);
  });

  it("logs a warning before each retry and an error when giving up", async () => {
    vi.useFakeTimers();
    const warn = vi.fn();
    const errorLog = vi.fn();
    const fetch = createMockFetch([{ status: 500, body: {} }]);
    const kit = createKitClient({
      fetch,
      retry: { ...fastRetry, maxRetries: 2 },
      logger: { warn, error: errorLog },
    });

    const settled = kit.getTaxInfo().then(
      () => undefined,
      (thrown: unknown) => thrown,
    );
    await vi.advanceTimersByTimeAsync(1000);
    await settled;

    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0]?.[0]).toContain("attempt 1/2");
    expect(errorLog).toHaveBeenCalledTimes(1);
  });

  it("honours Retry-After when the server is rate limiting", async () => {
    vi.useFakeTimers();
    const fetch = createMockFetch([
      { status: 429, body: {}, headers: { "retry-after": "2" } },
      { status: 200, body: taxResponse },
    ]);
    const kit = createKitClient({
      fetch,
      // maxDelayMs * 3 must be above the advertised 2 s, otherwise the delay is clipped.
      retry: { ...fastRetry, maxRetries: 1, maxDelayMs: 5_000 },
    });

    const settled = kit.getTaxInfo().then(
      (value) => value,
      (thrown: unknown) => thrown,
    );
    // Waiting less than the advertised 2 s must not complete the retry.
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetch.callCount).toBe(1);
    await vi.advanceTimersByTimeAsync(2000);

    expect(await settled).toMatchObject({ idleTax: 50000n });
  });
});
