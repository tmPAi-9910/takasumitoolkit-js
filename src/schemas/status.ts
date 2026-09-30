import { z } from "zod";
import { dateTimeSchema, int32Schema, int64Schema, laxObject } from "./common";

/** `components.schemas.StatusEntry` — one bot status sample. */
export const statusEntrySchema = laxObject(
  z.object({
    id: int64Schema,
    ping: int32Schema,
    totalUser: int64Schema,
    totalGuild: int64Schema,
    totalCommand: int64Schema,
    cpuUsage: int32Schema,
    memoryUsage: int32Schema,
    loggedAt: dateTimeSchema,
  }),
);

/** One entry returned by `getStatus()`. */
export type StatusEntry = z.infer<typeof statusEntrySchema>;

/** Response body of `getStatus()` (`StatusEntry[]`). */
export const statusResponseSchema = z.array(statusEntrySchema);
