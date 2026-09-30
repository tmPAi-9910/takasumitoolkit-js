import { TakasumiBotKitValidationError } from "../errors";

/** Locale aware number formatting options (a subset of `Intl.NumberFormatOptions`). */
export interface FormatNumberOptions {
  /** BCP 47 locale. Defaults to `ja-JP` (q9). */
  readonly locale?: string;
  /** Minimum number of fraction digits. */
  readonly minimumFractionDigits?: number;
  /** Maximum number of fraction digits. */
  readonly maximumFractionDigits?: number;
  /** `standard` (default) or `compact` (`1.2万` / `1.2K`). */
  readonly notation?: "standard" | "compact";
  /** `short` (default) or `long`, only used with `notation: "compact"`. */
  readonly compactDisplay?: "short" | "long";
}

/** Default locale of every formatting helper (q9). */
export const DEFAULT_LOCALE = "ja-JP";

/**
 * Formats a number with `Intl.NumberFormat`.
 *
 * `bigint` values are supported, so `int64` fields can be rendered without
 * losing precision.
 *
 * @param value - Value to format. `NaN` and non numeric values are rejected.
 * @param options - Locale and `Intl.NumberFormat` options.
 * @returns The formatted string (e.g. `"1,234,567"`).
 * @throws {TakasumiBotKitValidationError} When `value` is not a finite number
 *   or a bigint, or when the options are invalid.
 *
 * @example
 * ```ts
 * formatNumber(1234567); // "1,234,567"
 * formatNumber(1234567n); // "1,234,567"
 * formatNumber(1234.5, { maximumFractionDigits: 1 }); // "1,234.5"
 * ```
 */
export function formatNumber(value: number | bigint, options: FormatNumberOptions = {}): string {
  if (typeof value !== "number" && typeof value !== "bigint") {
    throw new TakasumiBotKitValidationError("value must be a number or a bigint", {
      field: "value",
      value,
      code: "INVALID_ARGUMENT",
    });
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new TakasumiBotKitValidationError("value must be a finite number", {
      field: "value",
      value,
      code: "INVALID_ARGUMENT",
    });
  }
  if (typeof options !== "object" || options === null) {
    throw new TakasumiBotKitValidationError("options must be an object", {
      field: "options",
      value: options,
      code: "INVALID_ARGUMENT",
    });
  }
  if (options.locale !== undefined && typeof options.locale !== "string") {
    throw new TakasumiBotKitValidationError("options.locale must be a string", {
      field: "options.locale",
      value: options.locale,
      code: "INVALID_ARGUMENT",
    });
  }

  try {
    return new Intl.NumberFormat(options.locale ?? DEFAULT_LOCALE, {
      minimumFractionDigits: options.minimumFractionDigits,
      maximumFractionDigits: options.maximumFractionDigits,
      notation: options.notation,
      compactDisplay: options.compactDisplay,
    }).format(value);
  } catch (error) {
    throw new TakasumiBotKitValidationError(
      `Invalid number format options: ${error instanceof Error ? error.message : String(error)}`,
      { field: "options", value: options, code: "INVALID_ARGUMENT", cause: error },
    );
  }
}
