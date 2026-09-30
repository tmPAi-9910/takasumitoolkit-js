import { describe, expect, it } from "vitest";
import { computeRetryDelay, parseRetryAfterMs } from "../../../src/retry/backoff";
import { DEFAULT_RETRY_CONFIG } from "../../../src/retry/retryConfig";

const noJitter = { ...DEFAULT_RETRY_CONFIG, jitter: false };

describe("backoff", () => {
  it("grows exponentially and is capped by maxDelayMs", () => {
    expect(computeRetryDelay({ attempt: 0, config: noJitter })).toBe(300);
    expect(computeRetryDelay({ attempt: 1, config: noJitter })).toBe(600);
    expect(computeRetryDelay({ attempt: 2, config: noJitter })).toBe(1200);
    expect(computeRetryDelay({ attempt: 10, config: noJitter })).toBe(5000);
  });

  it("applies a 50%-100% jitter when enabled", () => {
    expect(computeRetryDelay({ attempt: 0, config: DEFAULT_RETRY_CONFIG, random: () => 0 })).toBe(
      150,
    );
    expect(computeRetryDelay({ attempt: 0, config: DEFAULT_RETRY_CONFIG, random: () => 0.5 })).toBe(
      225,
    );
    expect(computeRetryDelay({ attempt: 0, config: DEFAULT_RETRY_CONFIG, random: () => 1 })).toBe(
      300,
    );
  });

  it("parses Retry-After seconds", () => {
    expect(parseRetryAfterMs("120", 0)).toBe(120_000);
    expect(parseRetryAfterMs("0.5", 0)).toBe(500);
    expect(parseRetryAfterMs(undefined, 0)).toBeUndefined();
    expect(parseRetryAfterMs("", 0)).toBeUndefined();
    expect(parseRetryAfterMs("soon", 0)).toBeUndefined();
  });

  it("parses Retry-After HTTP dates", () => {
    const now = Date.parse("Wed, 21 Oct 2015 07:28:00 GMT");
    expect(parseRetryAfterMs("Wed, 21 Oct 2015 07:29:00 GMT", now)).toBe(60_000);
    // a date in the past never yields a negative delay
    expect(parseRetryAfterMs("Wed, 21 Oct 2015 07:27:00 GMT", now)).toBe(0);
  });

  it("prefers Retry-After over the backoff", () => {
    const config = { ...noJitter, maxDelayMs: 60_000 };
    expect(computeRetryDelay({ attempt: 0, config, retryAfter: "120", now: 0 })).toBe(120_000);
  });

  it("clips Retry-After to maxDelayMs * 3", () => {
    expect(computeRetryDelay({ attempt: 0, config: noJitter, retryAfter: "3600", now: 0 })).toBe(
      15_000,
    );
  });

  it("falls back to the backoff when Retry-After is unparsable", () => {
    expect(computeRetryDelay({ attempt: 1, config: noJitter, retryAfter: "invalid", now: 0 })).toBe(
      600,
    );
  });
});
