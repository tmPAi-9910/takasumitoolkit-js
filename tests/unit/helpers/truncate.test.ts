import { describe, expect, it } from "vitest";
import { TakasumiBotKitValidationError } from "../../../src/errors";
import { truncate } from "../../../src/helpers/truncate";

describe("truncate", () => {
  it("includes the ellipsis in maxLength", () => {
    expect(truncate("hello world", 5)).toBe("he...");
    expect(truncate("hello world", 5)).toHaveLength(5);
  });

  it("returns short texts untouched", () => {
    expect(truncate("hello", 10)).toBe("hello");
    expect(truncate("hello", 5)).toBe("hello");
  });

  it("returns an empty string for maxLength 0", () => {
    expect(truncate("hello world", 0)).toBe("");
  });

  it("omits the ellipsis when maxLength is not larger than it", () => {
    expect(truncate("hello world", 2)).toBe("he");
    expect(truncate("hello world", 3)).toBe("hel");
    expect(truncate("hello world", 4)).toBe("h...");
  });

  it("supports a custom ellipsis", () => {
    expect(truncate("hello world", 6, { ellipsis: "…" })).toBe("hello…");
  });

  it("rejects invalid arguments", () => {
    expect(() => truncate(42 as unknown as string, 5)).toThrowError(TakasumiBotKitValidationError);
    expect(() => truncate("hello", -1)).toThrowError(TakasumiBotKitValidationError);
    expect(() => truncate("hello", Number.NaN)).toThrowError(TakasumiBotKitValidationError);
    expect(() => truncate("hello", 1.5)).toThrowError(TakasumiBotKitValidationError);
    expect(() => truncate("hello", 5, { ellipsis: 3 as unknown as string })).toThrowError(
      TakasumiBotKitValidationError,
    );
  });
});
