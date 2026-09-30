import { z } from "zod";
import { int32Schema, laxObject } from "./common";

/** `components.schemas.DiscordUserSearchResponse` — a Discord user lookup result. */
export const discordUserSearchResponseSchema = laxObject(
  z.object({
    accentColor: int32Schema,
    avatar: z.string().nullable(),
    banner: z.string().nullable(),
    bot: z.boolean(),
    flags: int32Schema,
    globalName: z.string().nullable(),
    id: z.string(),
    username: z.string(),
  }),
);

/** Response of `getDiscordUserByName()`. */
export type DiscordUserSearchResponse = z.infer<typeof discordUserSearchResponseSchema>;
