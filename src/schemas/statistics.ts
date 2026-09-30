import { z } from "zod";
import { int64Schema, laxObject } from "./common";

/** One "one day value + difference" couple of the statistics payload. */
const eventDeltaSchema = laxObject(
  z.object({
    oneDay: int64Schema,
    difference: int64Schema,
  }),
);

/** One "one day value + difference" couple, including the unique-user variant. */
const eventDeltaWithUsersSchema = laxObject(
  z.object({
    oneDay: int64Schema,
    difference: int64Schema,
    oneDayOnlyUser: int64Schema,
    differenceOnlyUser: int64Schema,
  }),
);

/** `components.schemas.StatisticsResponse` — global bot statistics. */
export const statisticsResponseSchema = laxObject(
  z.object({
    user: laxObject(
      z.object({
        totalEarn: int64Schema,
        totalUse: int64Schema,
        totalTax: int64Schema,
        totalWork: int64Schema,
        totalCommand: int64Schema,
      }),
    ),
    company: laxObject(
      z.object({
        totalEarn: int64Schema,
        totalUse: int64Schema,
        totalTax: int64Schema,
      }),
    ),
    economy: laxObject(
      z.object({
        treasury: int64Schema,
        debt: int64Schema,
      }),
    ),
    event: laxObject(
      z.object({
        total: int64Schema,
        totalOnlyUser: int64Schema,
        messageCreate: eventDeltaWithUsersSchema,
        interactionCreate: eventDeltaWithUsersSchema,
        guildMemberAdd: eventDeltaSchema,
        guildMemberRemove: eventDeltaSchema,
        guildCreate: eventDeltaSchema,
        guildDelete: eventDeltaSchema,
      }),
    ),
  }),
);

/** Response of `getStatisticsInfo()`. */
export type StatisticsResponse = z.infer<typeof statisticsResponseSchema>;
