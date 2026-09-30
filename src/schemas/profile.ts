import { z } from "zod";
import { int64Schema, laxObject } from "./common";

/** `components.schemas.ProfileResponse` — assets, chips and job of a Discord user. */
export const profileResponseSchema = laxObject(
  z.object({
    assets: int64Schema,
    chips: int64Schema,
    jobType: z.string(),
  }),
);

/** Response of `getProfileById()`. */
export type ProfileResponse = z.infer<typeof profileResponseSchema>;
