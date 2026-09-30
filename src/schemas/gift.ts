import { z } from "zod";
import { dateTimeSchema, int64Schema, laxObject } from "./common";

/** `components.schemas.GiftResponse` — information about a single gift code. */
export const giftResponseSchema = laxObject(
  z.object({
    type: z.enum(["gift"]),
    id: z.string(),
    userId: z.string(),
    status: z.enum(["received", "unused"]),
    receiverId: z.string().nullable(),
    amount: int64Schema,
    boughtAt: dateTimeSchema.nullable(),
    createdAt: dateTimeSchema,
  }),
);

/** Response of `getGiftInfo()`. */
export type GiftResponse = z.infer<typeof giftResponseSchema>;
