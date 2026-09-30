import { TakasumiBotKitValidationError } from "../errors";

/** Gift codes are exactly 10 alphanumeric characters (q16: strict). */
export const GIFT_ID_PATTERN = /^[A-Za-z0-9]{10}$/;

/**
 * Ensures `value` is a non blank string.
 *
 * @param value - Value to check.
 * @param field - Argument name used in the error.
 * @returns The trimmed value.
 * @throws {TakasumiBotKitValidationError} When `value` is not a non blank
 *   string.
 *
 * @example
 * ```ts
 * requireNonEmptyString(" 123 ", "id"); // "123"
 * ```
 */
export function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TakasumiBotKitValidationError(`${field} must be a non-empty string`, {
      field,
      value,
      code: "EMPTY_ARGUMENT",
    });
  }
  return value.trim();
}

/**
 * Ensures `id` is a well formed gift code (`/^[A-Za-z0-9]{10}$/`).
 *
 * @param id - Gift code to check.
 * @returns The validated gift code.
 * @throws {TakasumiBotKitValidationError} With code `INVALID_GIFT_ID`.
 *
 * @example
 * ```ts
 * requireGiftId("Abc123Xyz0"); // "Abc123Xyz0"
 * ```
 */
export function requireGiftId(id: unknown): string {
  if (typeof id !== "string" || !GIFT_ID_PATTERN.test(id)) {
    throw new TakasumiBotKitValidationError(
      "id must be a 10 character gift code matching /^[A-Za-z0-9]{10}$/",
      { field: "id", value: id, code: "INVALID_GIFT_ID" },
    );
  }
  return id;
}

/**
 * Ensures `id` is a non blank stock code.
 *
 * @param id - Stock code to check.
 * @returns The trimmed stock code.
 * @throws {TakasumiBotKitValidationError} With code `INVALID_STOCK_ID`.
 */
export function requireStockId(id: unknown): string {
  try {
    return requireNonEmptyString(id, "id");
  } catch (error) {
    if (error instanceof TakasumiBotKitValidationError) {
      throw new TakasumiBotKitValidationError(error.message, {
        field: "id",
        value: id,
        code: "INVALID_STOCK_ID",
        cause: error,
      });
    }
    throw error;
  }
}

/**
 * Validates the `limit` argument shared by the stock history helpers.
 *
 * Rules: `undefined` → whole history, `0` → empty array, negative / `NaN` /
 * non integer → {@link TakasumiBotKitValidationError}.
 *
 * @param limit - Raw limit value (usually `options.limit`).
 * @returns The validated limit, or `undefined` for "no limit".
 * @throws {TakasumiBotKitValidationError} With code `INVALID_LIMIT`.
 *
 * @example
 * ```ts
 * validateHistoryLimit(0); // 0
 * validateHistoryLimit(undefined); // undefined
 * ```
 */
export function validateHistoryLimit(limit: unknown): number | undefined {
  if (limit === undefined || limit === null) {
    return undefined;
  }
  if (typeof limit !== "number" || Number.isNaN(limit)) {
    throw new TakasumiBotKitValidationError("limit must be a number", {
      field: "limit",
      value: limit,
      code: "INVALID_LIMIT",
    });
  }
  if (!Number.isInteger(limit)) {
    throw new TakasumiBotKitValidationError("limit must be an integer", {
      field: "limit",
      value: limit,
      code: "INVALID_LIMIT",
    });
  }
  if (limit < 0) {
    throw new TakasumiBotKitValidationError("limit must be a positive integer or 0", {
      field: "limit",
      value: limit,
      code: "INVALID_LIMIT",
    });
  }
  return limit;
}
