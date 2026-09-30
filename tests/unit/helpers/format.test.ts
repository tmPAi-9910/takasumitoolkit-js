import { describe, expect, it, vi } from "vitest";
import { TakasumiBotKitValidationError } from "../../../src/errors";
import { formatNumber } from "../../../src/helpers/formatNumber";
import { formatTimestamp } from "../../../src/helpers/formatTimestamp";

describe("formatNumber", () => {
  it("uses ja-JP by default", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
    expect(formatNumber(1234567n)).toBe("1,234,567");
  });

  it("handles bigint values beyond the safe integer range", () => {
    expect(formatNumber(9007199254740993n)).toBe("9,007,199,254,740,993");
  });

  it("honours the fraction digits", () => {
    expect(formatNumber(1234.5, { maximumFractionDigits: 1 })).toBe("1,234.5");
    expect(formatNumber(1234.5, { locale: "en-US" })).toBe("1,234.5");
  });

  it("supports the compact notation", () => {
    expect(formatNumber(1234, { locale: "en-US", notation: "compact" })).toBe("1.2K");
  });

  it("rejects invalid values", () => {
    expect(() => formatNumber(Number.NaN)).toThrowError(TakasumiBotKitValidationError);
    expect(() => formatNumber(Number.POSITIVE_INFINITY)).toThrowError(
      TakasumiBotKitValidationError,
    );
    expect(() => formatNumber("1" as never)).toThrowError(TakasumiBotKitValidationError);
  });

  it("rejects invalid options", () => {
    expect(() => formatNumber(1, { locale: 1 as never })).toThrowError(
      TakasumiBotKitValidationError,
    );
    expect(() =>
      formatNumber(1, { minimumFractionDigits: 5, maximumFractionDigits: 1 }),
    ).toThrowError(TakasumiBotKitValidationError);
  });
});

describe("formatTimestamp", () => {
  it("defaults to the ISO representation", () => {
    expect(formatTimestamp("2024-01-01T00:00:00Z")).toBe("2024-01-01T00:00:00.000Z");
  });

  it("accepts numbers, bigints and Dates", () => {
    const ms = Date.parse("2024-01-01T00:00:00.000Z");
    expect(formatTimestamp(ms)).toBe("2024-01-01T00:00:00.000Z");
    expect(formatTimestamp(BigInt(ms))).toBe("2024-01-01T00:00:00.000Z");
    expect(formatTimestamp(new Date(ms))).toBe("2024-01-01T00:00:00.000Z");
  });

  it("formats with a locale", () => {
    expect(
      formatTimestamp("2024-01-01T00:00:00Z", { format: "locale", timeZone: "UTC" }),
    ).toContain("2024");
    expect(
      formatTimestamp("2024-01-01T00:00:00Z", {
        format: "locale",
        locale: "en-US",
        timeZone: "UTC",
      }),
    ).toBe("1/1/2024, 12:00:00 AM");
  });

  it("formats relative timestamps", () => {
    const now = Date.parse("2024-06-01T00:00:00.000Z");
    vi.useFakeTimers();
    try {
      vi.setSystemTime(now);
      expect(formatTimestamp(now, { format: "relative", locale: "en" })).toBe("now");
      expect(formatTimestamp(now - 5 * 60_000, { format: "relative", locale: "en" })).toBe(
        "5 minutes ago",
      );
      expect(formatTimestamp(now - 3 * 3_600_000, { format: "relative", locale: "en" })).toBe(
        "3 hours ago",
      );
      expect(formatTimestamp(now - 2 * 86_400_000, { format: "relative", locale: "en" })).toBe(
        "2 days ago",
      );
      expect(formatTimestamp(now - 5 * 60_000, { format: "relative" })).toBe("5 分前");
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects unparsable values", () => {
    expect(() => formatTimestamp("not-a-date")).toThrowError(TakasumiBotKitValidationError);
    expect(() => formatTimestamp(new Date("nope"))).toThrowError(TakasumiBotKitValidationError);
    expect(() => formatTimestamp({} as never)).toThrowError(TakasumiBotKitValidationError);
    expect(() => formatTimestamp(0, { format: "nope" as never })).toThrowError(
      TakasumiBotKitValidationError,
    );
  });
});
