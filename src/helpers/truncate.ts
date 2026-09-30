import { TakasumiBotKitValidationError } from "../errors";

/** Options of {@link truncate}. */
export interface TruncateOptions {
  /** Omission marker. Defaults to `"..."`. It counts towards `maxLength`. */
  readonly ellipsis?: string;
}

/**
 * Shortens `text` so that the result is at most `maxLength` characters long.
 *
 * The ellipsis is **included** in `maxLength` (q11):
 * `truncate("hello world", 5)` → `"he..."`.
 *
 * @param text - Text to shorten.
 * @param maxLength - Maximum length of the result (`0` or a positive integer).
 * @param options - Optional custom `ellipsis`.
 * @returns `text` when it already fits, otherwise the truncated text.
 * @throws {TakasumiBotKitValidationError} When `text` is not a string, or
 *   `maxLength` is negative, `NaN` or not an integer.
 *
 * @example
 * ```ts
 * truncate("hello world", 5); // "he..."
 * truncate("hello", 10); // "hello"
 * truncate("hello world", 0); // ""
 * ```
 */
export function truncate(text: string, maxLength: number, options: TruncateOptions = {}): string {
  if (typeof text !== "string") {
    throw new TakasumiBotKitValidationError("text must be a string", {
      field: "text",
      value: text,
      code: "INVALID_ARGUMENT",
    });
  }
  if (typeof maxLength !== "number" || Number.isNaN(maxLength) || !Number.isInteger(maxLength)) {
    throw new TakasumiBotKitValidationError("maxLength must be an integer", {
      field: "maxLength",
      value: maxLength,
      code: "INVALID_ARGUMENT",
    });
  }
  if (maxLength < 0) {
    throw new TakasumiBotKitValidationError("maxLength must be 0 or greater", {
      field: "maxLength",
      value: maxLength,
      code: "INVALID_ARGUMENT",
    });
  }

  const ellipsis = options.ellipsis ?? "...";
  if (typeof ellipsis !== "string") {
    throw new TakasumiBotKitValidationError("options.ellipsis must be a string", {
      field: "options.ellipsis",
      value: options.ellipsis,
      code: "INVALID_ARGUMENT",
    });
  }

  if (text.length <= maxLength) {
    return text;
  }
  if (maxLength <= ellipsis.length) {
    return text.slice(0, maxLength);
  }
  return `${text.slice(0, maxLength - ellipsis.length)}${ellipsis}`;
}
