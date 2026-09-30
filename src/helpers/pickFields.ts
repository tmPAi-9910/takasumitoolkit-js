import { TakasumiBotKitValidationError } from "../errors";

/** Keys that are never copied, to keep prototype pollution impossible. */
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Validates that `value` is a non-null object and returns it.
 *
 * @param value - Value to check.
 * @param field - Argument name used in the error.
 * @returns The validated object.
 * @throws {TakasumiBotKitValidationError} When `value` is not an object.
 */
function requireObject(value: unknown, field: string): object {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TakasumiBotKitValidationError(`${field} must be an object`, {
      field,
      value,
      code: "INVALID_ARGUMENT",
    });
  }
  return value;
}

/**
 * Validates that `value` is an array.
 *
 * @param value - Value to check.
 * @param field - Argument name used in the error.
 * @returns The validated array.
 * @throws {TakasumiBotKitValidationError} When `value` is not an array.
 */
function requireArray(value: unknown, field: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new TakasumiBotKitValidationError(`${field} must be an array`, {
      field,
      value,
      code: "INVALID_ARGUMENT",
    });
  }
  return value;
}

/**
 * Returns a shallow copy of `object` containing only `keys`.
 *
 * Keys that are not own properties are ignored, and `__proto__`,
 * `constructor` and `prototype` are never copied.
 *
 * @param object - Source object (never mutated).
 * @param keys - Keys to keep.
 * @returns A new object with the selected keys.
 * @throws {TakasumiBotKitValidationError} When `object` is not an object or
 *   `keys` is not an array.
 *
 * @example
 * ```ts
 * pickFields({ a: 1, b: 2, c: 3 }, ["a", "c"]); // { a: 1, c: 3 }
 * ```
 */
export function pickFields<T extends object, K extends keyof T>(
  object: T,
  keys: readonly K[],
): Pick<T, K> {
  const source = requireObject(object, "object") as T;
  const selected = requireArray(keys, "keys") as readonly K[];
  const result: Partial<Pick<T, K>> = {};
  for (const key of selected) {
    if (typeof key === "string" && FORBIDDEN_KEYS.has(key)) {
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(source, key)) {
      continue;
    }
    result[key] = source[key];
  }
  return result as Pick<T, K>;
}

/**
 * Returns a shallow copy of `object` without `keys`.
 *
 * @param object - Source object (never mutated).
 * @param keys - Keys to drop.
 * @returns A new object without the selected keys.
 * @throws {TakasumiBotKitValidationError} When `object` is not an object or
 *   `keys` is not an array.
 *
 * @example
 * ```ts
 * omitFields({ a: 1, b: 2, c: 3 }, ["b"]); // { a: 1, c: 3 }
 * ```
 */
export function omitFields<T extends object, K extends keyof T>(
  object: T,
  keys: readonly K[],
): Omit<T, K> {
  const source = requireObject(object, "object") as T;
  const dropped = new Set<unknown>(requireArray(keys, "keys") as readonly K[]);
  const result: Partial<Record<keyof T, unknown>> = {};
  for (const key of Object.keys(source) as (keyof T)[]) {
    if (dropped.has(key)) {
      continue;
    }
    if (typeof key === "string" && FORBIDDEN_KEYS.has(key)) {
      continue;
    }
    result[key] = source[key];
  }
  return result as Omit<T, K>;
}
