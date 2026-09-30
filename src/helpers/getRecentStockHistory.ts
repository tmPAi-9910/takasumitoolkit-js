import { TakasumiBotKitValidationError } from "../errors";
import { validateHistoryLimit } from "../internal/validate";

/**
 * Returns the newest prices of a stock history, newest first.
 *
 * The input is expected to be `StockEntry.prices`, i.e. **ascending in time**
 * with the newest value last (q1). The `limit` rules are the ones used by
 * `kit.getStockHistoryById()`:
 *
 * - `undefined` → the whole history, reversed
 * - `0` → `[]`
 * - negative, `NaN` or non integer → {@link TakasumiBotKitValidationError}
 *
 * @param history - Price history, oldest first (newest last).
 * @param limit - Number of prices to keep, counted from the newest.
 * @returns A new array ordered from the newest to the oldest price. The input
 *   array is never mutated.
 * @throws {TakasumiBotKitValidationError} When `history` is not an array of
 *   numbers/bigints, or when `limit` is invalid.
 *
 * @example
 * ```ts
 * getRecentStockHistory([100, 101, 102, 103], 2); // [103, 102]
 * getRecentStockHistory([100n, 101n, 102n]); // [102n, 101n, 100n]
 * getRecentStockHistory([100, 101, 102], 0); // []
 * ```
 */
export function getRecentStockHistory<T extends number | bigint>(
  history: readonly T[],
  limit?: number,
): T[] {
  if (!Array.isArray(history)) {
    throw new TakasumiBotKitValidationError("history must be an array of numbers or bigints", {
      field: "history",
      value: history,
      code: "INVALID_ARGUMENT",
    });
  }
  for (const [index, value] of history.entries()) {
    if (typeof value === "number" && Number.isFinite(value)) {
      continue;
    }
    if (typeof value === "bigint") {
      continue;
    }
    throw new TakasumiBotKitValidationError(
      `history[${index}] must be a finite number or a bigint`,
      { field: `history[${index}]`, value, code: "INVALID_ARGUMENT" },
    );
  }

  const validatedLimit = validateHistoryLimit(limit);
  if (validatedLimit === 0) {
    return [];
  }
  const sliced =
    validatedLimit === undefined
      ? history.slice()
      : history.slice(Math.max(0, history.length - validatedLimit));
  return sliced.reverse();
}
