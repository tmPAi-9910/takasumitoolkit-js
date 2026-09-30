import { z } from "zod";

/**
 * Wraps an object schema so that unknown keys are **preserved** instead of being
 * stripped (q8: `passthrough`).
 *
 * The returned schema validates exactly like the input one, but keeps every
 * additional property the API may add in the future, so a new field never
 * breaks an existing integration.
 *
 * The declared output type is intentionally the *clean* object type (without an
 * index signature) so that the public SDK types stay readable; the runtime
 * value simply carries extra properties.
 *
 * @param schema - Object schema to relax.
 * @returns A schema with the same output type that passes unknown keys through.
 *
 * @example
 * ```ts
 * const schema = laxObject(z.object({ a: z.string() }));
 * schema.parse({ a: "x", b: 1 }); // { a: "x", b: 1 }
 * ```
 */
export function laxObject<S extends z.ZodObject<z.ZodRawShape>>(
  schema: S,
): z.ZodType<z.infer<S>, z.ZodTypeDef, unknown> {
  // The cast is safe: `.passthrough()` only widens the *runtime* output with
  // extra unknown properties, which the declared type deliberately omits so
  // that `keyof` stays a finite union of the documented fields.
  return schema.passthrough() as unknown as z.ZodType<z.infer<S>, z.ZodTypeDef, unknown>;
}

const INTEGER_STRING = /^-?\d+$/;

/** Accepts `bigint`, an integer `number`, or a decimal string, and yields a `bigint`. */
const intLikeSchema = z.union([
  z.number().int(),
  z.bigint(),
  z.string().regex(INTEGER_STRING, "Expected an integer-like value"),
]);

/**
 * Schema for OpenAPI `type: integer, format: int64`.
 *
 * Accepts a `bigint` (produced by {@link parseJsonWithBigInt} for values beyond
 * the safe integer range), a safe integer `number`, or a decimal `string`, and
 * always yields a `bigint` so no precision is lost.
 *
 * @example
 * ```ts
 * int64Schema.parse(9007199254740993n); // 9007199254740993n
 * int64Schema.parse(42); // 42n
 * ```
 */
export const int64Schema = intLikeSchema.transform((value) =>
  typeof value === "bigint" ? value : BigInt(value),
);

/**
 * Schema for OpenAPI `type: integer, format: int32`.
 *
 * @example
 * ```ts
 * int32Schema.parse(42); // 42
 * ```
 */
export const int32Schema = intLikeSchema.transform((value) => Number(value));

/** Schema for OpenAPI `type: number` (any finite JSON number). */
export const numberSchema = z.number();

/**
 * Schema for OpenAPI `type: string, format: date-time`.
 *
 * Validation is intentionally permissive (anything `Date` can parse) because
 * the API is free to emit an offset instead of `Z`.
 */
export const dateTimeSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: "Invalid date-time string" });
