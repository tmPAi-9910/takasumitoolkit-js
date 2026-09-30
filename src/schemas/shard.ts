import { z } from "zod";
import { dateTimeSchema, laxObject } from "./common";

/**
 * `components.schemas.ShardDataEntry` — per shard counters.
 *
 * Note: `guildCount`, `userCount` and `ping` are declared as `string` in the
 * OpenAPI document, so the SDK keeps them as strings.
 */
export const shardDataEntrySchema = laxObject(
  z.object({
    shardId: z.string(),
    guildCount: z.string(),
    userCount: z.string(),
    ping: z.string(),
  }),
);

/** One shard row. */
export type ShardDataEntry = z.infer<typeof shardDataEntrySchema>;

/** `components.schemas.ShardResponse` — shard snapshot. */
export const shardResponseSchema = laxObject(
  z.object({
    data: z.array(shardDataEntrySchema),
    loggedAt: dateTimeSchema,
  }),
);

/** Response of `getShardInfo()`. */
export type ShardResponse = z.infer<typeof shardResponseSchema>;
