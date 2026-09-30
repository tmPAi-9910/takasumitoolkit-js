import { z } from "zod";
import { dateTimeSchema, int64Schema, laxObject } from "./common";

/** `components.schemas.HistoryEntry` — one transaction of a Discord user. */
export const historyEntrySchema = laxObject(
  z.object({
    id: int64Schema,
    userId: z.string(),
    amount: int64Schema,
    reason: z.string(),
    tradedAt: dateTimeSchema,
  }),
);

/** One entry returned by `getHistoryById()`. */
export type HistoryEntry = z.infer<typeof historyEntrySchema>;

/** Response body of `getHistoryById()` (`HistoryEntry[]`). */
export const historyResponseSchema = z.array(historyEntrySchema);
