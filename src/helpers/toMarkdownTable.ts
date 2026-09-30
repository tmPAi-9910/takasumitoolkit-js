import { TakasumiBotKitValidationError } from "../errors";

/** Cell value accepted by {@link toMarkdownTable}. */
export type MarkdownTableCell = string | number | boolean | bigint | null | undefined;

/** One row of a Markdown table. */
export type MarkdownTableRow = Readonly<Record<string, MarkdownTableCell>>;

/** Column alignment of a Markdown table. */
export type MarkdownTableAlign = "left" | "center" | "right";

/** Options of {@link toMarkdownTable}. */
export interface ToMarkdownTableOptions {
  /** Explicit column order. Defaults to the keys of the first row. */
  readonly headers?: readonly string[];
  /** Per column alignment. Defaults to plain `| --- |` separators. */
  readonly align?: readonly MarkdownTableAlign[];
}

/**
 * Escapes one Markdown table cell (q12).
 *
 * `|` becomes `\|`, line breaks become `<br>`, and `null` / `undefined` become
 * an empty string.
 *
 * @param value - Raw cell value.
 * @returns The escaped cell.
 */
function escapeCell(value: MarkdownTableCell): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value)
    .replace(/\r\n/g, "<br>")
    .replace(/\n/g, "<br>")
    .replace(/\r/g, "<br>")
    .replace(/\|/g, "\\|");
}

/**
 * Renders rows as a Markdown table.
 *
 * @param rows - Rows to render. An empty array produces an empty string.
 * @param options - Optional explicit `headers` and per column `align`.
 * @returns The Markdown table (without a trailing newline).
 * @throws {TakasumiBotKitValidationError} When `rows` is not an array, when a
 *   row is not an object, or when `headers` / `align` are invalid.
 *
 * @example
 * ```ts
 * toMarkdownTable([
 *   { name: "a", age: 1 },
 *   { name: "b", age: 2 },
 * ]);
 * // | name | age |
 * // | --- | --- |
 * // | a | 1 |
 * // | b | 2 |
 * ```
 */
export function toMarkdownTable(
  rows: readonly MarkdownTableRow[],
  options: ToMarkdownTableOptions = {},
): string {
  if (!Array.isArray(rows)) {
    throw new TakasumiBotKitValidationError("rows must be an array", {
      field: "rows",
      value: rows,
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
  if (rows.length === 0) {
    return "";
  }

  const firstRow = rows[0];
  if (typeof firstRow !== "object" || firstRow === null || Array.isArray(firstRow)) {
    throw new TakasumiBotKitValidationError("rows[0] must be an object", {
      field: "rows[0]",
      value: firstRow,
      code: "INVALID_ARGUMENT",
    });
  }

  const headers: readonly string[] =
    options.headers === undefined ? Object.keys(firstRow) : options.headers;
  if (!Array.isArray(headers) || headers.some((header) => typeof header !== "string")) {
    throw new TakasumiBotKitValidationError("options.headers must be an array of strings", {
      field: "options.headers",
      value: options.headers,
      code: "INVALID_ARGUMENT",
    });
  }

  const align: readonly MarkdownTableAlign[] | undefined = options.align;
  if (
    align !== undefined &&
    (!Array.isArray(align) ||
      align.some((value) => value !== "left" && value !== "center" && value !== "right"))
  ) {
    throw new TakasumiBotKitValidationError(
      "options.align must be an array of 'left' | 'center' | 'right'",
      { field: "options.align", value: options.align, code: "INVALID_ARGUMENT" },
    );
  }

  const separator = headers.map((_header, index) => {
    if (align === undefined) {
      return "---";
    }
    switch (align[index] ?? "left") {
      case "center":
        return ":---:";
      case "right":
        return "---:";
      default:
        return ":---";
    }
  });

  const lines: string[] = [
    `| ${headers.map(escapeCell).join(" | ")} |`,
    `| ${separator.join(" | ")} |`,
  ];

  for (const row of rows) {
    if (typeof row !== "object" || row === null || Array.isArray(row)) {
      throw new TakasumiBotKitValidationError("every row must be an object", {
        field: "rows",
        value: row,
        code: "INVALID_ARGUMENT",
      });
    }
    const cells = headers.map((header) => escapeCell(row[header]));
    lines.push(`| ${cells.join(" | ")} |`);
  }

  return lines.join("\n");
}
