import { truncate } from "./truncate";
import { omitFields, pickFields } from "./pickFields";
import { toMarkdownTable } from "./toMarkdownTable";
import { formatNumber } from "./formatNumber";
import { formatTimestamp } from "./formatTimestamp";
import { paginate } from "./paginate";
import { getRecentStockHistory } from "./getRecentStockHistory";

/**
 * All pure helpers bundled with the SDK.
 *
 * Available as named exports and as `kit.helpers`.
 */
export interface Helpers {
  /**
   * Shortens a string, ellipsis included in `maxLength`.
   *
   * @example
   * ```ts
   * kit.helpers.truncate("hello world", 5); // "he..."
   * ```
   */
  readonly truncate: typeof truncate;
  /**
   * Keeps only the selected keys of an object.
   *
   * @example
   * ```ts
   * kit.helpers.pickFields({ a: 1, b: 2 }, ["a"]); // { a: 1 }
   * ```
   */
  readonly pickFields: typeof pickFields;
  /**
   * Drops the selected keys of an object.
   *
   * @example
   * ```ts
   * kit.helpers.omitFields({ a: 1, b: 2 }, ["b"]); // { a: 1 }
   * ```
   */
  readonly omitFields: typeof omitFields;
  /**
   * Renders rows as a Markdown table.
   *
   * @example
   * ```ts
   * kit.helpers.toMarkdownTable([{ a: 1 }]);
   * ```
   */
  readonly toMarkdownTable: typeof toMarkdownTable;
  /**
   * Locale aware number formatting (bigint friendly).
   *
   * @example
   * ```ts
   * kit.helpers.formatNumber(1234567n); // "1,234,567"
   * ```
   */
  readonly formatNumber: typeof formatNumber;
  /**
   * ISO / locale / relative timestamp formatting.
   *
   * @example
   * ```ts
   * kit.helpers.formatTimestamp(Date.now(), { format: "relative" });
   * ```
   */
  readonly formatTimestamp: typeof formatTimestamp;
  /**
   * 1-based pagination returning metadata.
   *
   * @example
   * ```ts
   * kit.helpers.paginate([1, 2, 3], 1, 2);
   * ```
   */
  readonly paginate: typeof paginate;
  /**
   * Newest-first slice of a stock price history.
   *
   * @example
   * ```ts
   * kit.helpers.getRecentStockHistory([100n, 101n], 1); // [101n]
   * ```
   */
  readonly getRecentStockHistory: typeof getRecentStockHistory;
}

/** Frozen helper namespace exposed as `kit.helpers`. */
export const helpers: Helpers = Object.freeze({
  truncate,
  pickFields,
  omitFields,
  toMarkdownTable,
  formatNumber,
  formatTimestamp,
  paginate,
  getRecentStockHistory,
});

export { truncate } from "./truncate";
export type { TruncateOptions } from "./truncate";
export { pickFields, omitFields } from "./pickFields";
export { toMarkdownTable } from "./toMarkdownTable";
export type {
  MarkdownTableCell,
  MarkdownTableRow,
  MarkdownTableAlign,
  ToMarkdownTableOptions,
} from "./toMarkdownTable";
export { formatNumber, DEFAULT_LOCALE } from "./formatNumber";
export type { FormatNumberOptions } from "./formatNumber";
export { formatTimestamp } from "./formatTimestamp";
export type { TimestampInput, TimestampFormat, FormatTimestampOptions } from "./formatTimestamp";
export { paginate } from "./paginate";
export type { PaginateResult } from "./paginate";
export { getRecentStockHistory } from "./getRecentStockHistory";
