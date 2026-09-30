import { z } from "zod";
import { int64Schema, laxObject } from "./common";

/** `components.schemas.RankingEntry` — one row of the assets ranking. */
export const rankingEntrySchema = laxObject(
  z.object({
    id: z.string(),
    username: z.string(),
    avatarURL: z.string().nullable(),
    assets: int64Schema,
    chips: int64Schema,
    jobType: z.string(),
  }),
);

/** One entry returned by `getRanking()`. */
export type RankingEntry = z.infer<typeof rankingEntrySchema>;

/** Response body of `getRanking()` (`RankingEntry[]`). */
export const rankingResponseSchema = z.array(rankingEntrySchema);
