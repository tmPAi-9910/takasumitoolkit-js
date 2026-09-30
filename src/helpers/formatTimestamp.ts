import { TakasumiBotKitValidationError } from "../errors";
import { DEFAULT_LOCALE } from "./formatNumber";

/** Accepted timestamp inputs. */
export type TimestampInput = string | number | bigint | Date;

/** Output format of {@link formatTimestamp}. */
export type TimestampFormat = "iso" | "locale" | "relative";

/** Options of {@link formatTimestamp}. */
export interface FormatTimestampOptions {
  /** BCP 47 locale. Defaults to `ja-JP` (q9). */
  readonly locale?: string;
  /** IANA time zone used by the `locale` format. */
  readonly timeZone?: string;
  /** Output format. Defaults to `iso`. */
  readonly format?: TimestampFormat;
}

/** Unit thresholds (in seconds) used by the `relative` format. */
const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/** Converts `value` to a `Date`, or fails. */
function toDate(value: TimestampInput): Date {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new TakasumiBotKitValidationError("value must be a valid Date", {
        field: "value",
        value,
        code: "INVALID_ARGUMENT",
      });
    }
    return value;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    const ms = Number(value);
    if (!Number.isFinite(ms)) {
      throw new TakasumiBotKitValidationError("value must be a finite number of milliseconds", {
        field: "value",
        value,
        code: "INVALID_ARGUMENT",
      });
    }
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) {
      throw new TakasumiBotKitValidationError("value is out of the supported date range", {
        field: "value",
        value,
        code: "INVALID_ARGUMENT",
      });
    }
    return date;
  }
  if (typeof value === "string") {
    const ms = Date.parse(value);
    if (Number.isNaN(ms)) {
      throw new TakasumiBotKitValidationError(`value is not a parsable date string: "${value}"`, {
        field: "value",
        value,
        code: "INVALID_ARGUMENT",
      });
    }
    return new Date(ms);
  }
  throw new TakasumiBotKitValidationError("value must be a string, number, bigint or Date", {
    field: "value",
    value,
    code: "INVALID_ARGUMENT",
  });
}

/**
 * Formats `date` relatively to `now` with `Intl.RelativeTimeFormat`.
 *
 * @param date - Instant to format.
 * @param now - Reference instant.
 * @param locale - Locale used by `Intl.RelativeTimeFormat`.
 * @returns A relative description such as `"5 分前"` or `"in 5 minutes"`.
 */
function formatRelative(date: Date, now: number, locale: string): string {
  const diffSeconds = Math.round((date.getTime() - now) / 1000);
  const absolute = Math.abs(diffSeconds);
  const [value, unit]: [number, Intl.RelativeTimeFormatUnit] =
    absolute < MINUTE
      ? [diffSeconds, "second"]
      : absolute < HOUR
        ? [Math.round(diffSeconds / MINUTE), "minute"]
        : absolute < DAY
          ? [Math.round(diffSeconds / HOUR), "hour"]
          : absolute < MONTH
            ? [Math.round(diffSeconds / DAY), "day"]
            : absolute < YEAR
              ? [Math.round(diffSeconds / MONTH), "month"]
              : [Math.round(diffSeconds / YEAR), "year"];
  const formatter = new Intl.RelativeTimeFormat(locale, {
    numeric: value === 0 ? "auto" : "always",
  });
  return formatter.format(value, unit);
}

/**
 * Formats a timestamp.
 *
 * @param value - ISO 8601 string, epoch milliseconds (number or bigint) or
 *   `Date`.
 * @param options - Locale, time zone and output format (`iso` by default).
 * @returns The formatted timestamp.
 * @throws {TakasumiBotKitValidationError} When `value` cannot be converted to a
 *   valid date, or when the options are invalid.
 *
 * @example
 * ```ts
 * formatTimestamp("2024-01-01T00:00:00Z"); // "2024-01-01T00:00:00.000Z"
 * formatTimestamp(1704067200000n, { format: "locale" }); // "2024/1/1 9:00:00"
 * formatTimestamp(Date.now(), { format: "relative" }); // "今" (ja-JP)
 * ```
 */
export function formatTimestamp(
  value: TimestampInput,
  options: FormatTimestampOptions = {},
): string {
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

  const date = toDate(value);
  const locale = options.locale ?? DEFAULT_LOCALE;

  switch (options.format ?? "iso") {
    case "iso":
      return date.toISOString();
    case "locale":
      try {
        return date.toLocaleString(locale, { timeZone: options.timeZone });
      } catch (error) {
        throw new TakasumiBotKitValidationError(
          `Invalid timestamp format options: ${
            error instanceof Error ? error.message : String(error)
          }`,
          { field: "options", value: options, code: "INVALID_ARGUMENT", cause: error },
        );
      }
    case "relative":
      return formatRelative(date, Date.now(), locale);
    default:
      throw new TakasumiBotKitValidationError(
        "options.format must be one of 'iso' | 'locale' | 'relative'",
        { field: "options.format", value: options.format, code: "INVALID_ARGUMENT" },
      );
  }
}
