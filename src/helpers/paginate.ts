import { TakasumiBotKitValidationError } from "../errors";

/** Result of {@link paginate}. */
export interface PaginateResult<T> {
  /** Slice of `items` for the requested page (empty when out of range). */
  readonly items: T[];
  /** Requested page number (1-based, echoed back). */
  readonly page: number;
  /** Page size (echoed back). */
  readonly pageSize: number;
  /** Total number of items. */
  readonly totalItems: number;
  /** Total number of pages (`0` when there is no item). */
  readonly totalPages: number;
  /** Whether a next page exists. */
  readonly hasNext: boolean;
  /** Whether a previous page exists. */
  readonly hasPrev: boolean;
}

/** Validates that `value` is an integer `>= min`. */
function requirePositiveInteger(value: unknown, field: string, min: number): number {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isInteger(value)) {
    throw new TakasumiBotKitValidationError(`${field} must be an integer`, {
      field,
      value,
      code: "INVALID_ARGUMENT",
    });
  }
  if (value < min) {
    throw new TakasumiBotKitValidationError(`${field} must be >= ${min}`, {
      field,
      value,
      code: "INVALID_ARGUMENT",
    });
  }
  return value;
}

/**
 * Slices `items` for the requested page.
 *
 * `page` is **1-based**. Requesting a page beyond `totalPages` returns an empty
 * `items` array instead of throwing (q10).
 *
 * @param items - Items to paginate.
 * @param page - Page number, starting at `1`.
 * @param pageSize - Number of items per page.
 * @returns The page and its metadata.
 * @throws {TakasumiBotKitValidationError} When `items` is not an array, or when
 *   `page` / `pageSize` are not integers `>= 1`.
 *
 * @example
 * ```ts
 * paginate([1, 2, 3, 4, 5], 1, 2); // { items: [1, 2], totalPages: 3, hasNext: true, ... }
 * paginate([1, 2, 3], 10, 2); // { items: [], ... }
 * ```
 */
export function paginate<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): PaginateResult<T> {
  if (!Array.isArray(items)) {
    throw new TakasumiBotKitValidationError("items must be an array", {
      field: "items",
      value: items,
      code: "INVALID_ARGUMENT",
    });
  }
  const currentPage = requirePositiveInteger(page, "page", 1);
  const size = requirePositiveInteger(pageSize, "pageSize", 1);

  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / size);
  const start = (currentPage - 1) * size;
  return {
    items: items.slice(start, start + size),
    page: currentPage,
    pageSize: size,
    totalItems,
    totalPages,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
  };
}
