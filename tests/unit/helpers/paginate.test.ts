import { describe, expect, it } from "vitest";
import { TakasumiBotKitValidationError } from "../../../src/errors";
import { paginate } from "../../../src/helpers/paginate";

describe("paginate", () => {
  it("is 1-based", () => {
    const result = paginate([1, 2, 3, 4, 5], 1, 2);
    expect(result).toEqual({
      items: [1, 2],
      page: 1,
      pageSize: 2,
      totalItems: 5,
      totalPages: 3,
      hasNext: true,
      hasPrev: false,
    });
  });

  it("computes the following pages", () => {
    const result = paginate([1, 2, 3], 2, 2);
    expect(result.items).toEqual([3]);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(true);
  });

  it("returns an empty array beyond the last page", () => {
    const result = paginate([1, 2, 3], 10, 2);
    expect(result.items).toEqual([]);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(true);
    expect(result.totalPages).toBe(2);
  });

  it("handles empty inputs", () => {
    const result = paginate([], 1, 10);
    expect(result.totalPages).toBe(0);
    expect(result.items).toEqual([]);
    expect(result.hasNext).toBe(false);
  });

  it("rejects invalid arguments", () => {
    expect(() => paginate("nope" as never, 1, 10)).toThrowError(TakasumiBotKitValidationError);
    expect(() => paginate([1], 0, 10)).toThrowError(TakasumiBotKitValidationError);
    expect(() => paginate([1], -1, 10)).toThrowError(TakasumiBotKitValidationError);
    expect(() => paginate([1], 1.5, 10)).toThrowError(TakasumiBotKitValidationError);
    expect(() => paginate([1], Number.NaN, 10)).toThrowError(TakasumiBotKitValidationError);
    expect(() => paginate([1], 1, 0)).toThrowError(TakasumiBotKitValidationError);
  });
});
