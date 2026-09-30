import { z } from "zod";
import { dateTimeSchema, int64Schema, laxObject } from "./common";

/** Base (non relaxed) object schema, reused to compose the detail schema. */
const companyListEntryObjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  assets: int64Schema,
  salary: int64Schema,
  jobType: z.string(),
  ownerId: z.string(),
  updatedAt: dateTimeSchema,
  createdAt: dateTimeSchema,
});

/** `components.schemas.CompanyListEntry` — summary of a company. */
export const companyListEntrySchema = laxObject(companyListEntryObjectSchema);

/** One entry returned by `getCompanyList()`. */
export type CompanyListEntry = z.infer<typeof companyListEntrySchema>;

/** Response body of `getCompanyList()` (`CompanyListEntry[]`). */
export const companyListResponseSchema = z.array(companyListEntrySchema);

/** `components.schemas.CompanyEmployeeEntry` — one employee of a company. */
export const companyEmployeeEntrySchema = laxObject(
  z.object({
    userId: z.string(),
    companyId: z.string(),
    updatedAt: dateTimeSchema,
    joinedAt: dateTimeSchema,
  }),
);

/** One employee of a company. */
export type CompanyEmployeeEntry = z.infer<typeof companyEmployeeEntrySchema>;

/** `components.schemas.CompanyStatistics` — aggregated counters of a company. */
export const companyStatisticsSchema = laxObject(
  z.object({
    companyId: z.string(),
    totalEarn: int64Schema,
    totalUse: int64Schema,
    totalTax: int64Schema,
    updatedAt: dateTimeSchema,
  }),
);

/** Aggregated counters of a company. */
export type CompanyStatistics = z.infer<typeof companyStatisticsSchema>;

/** `components.schemas.CompanyDetailResponse` — full company detail. */
export const companyDetailResponseSchema = laxObject(
  z.object({
    ...companyListEntryObjectSchema.shape,
    statistics: companyStatisticsSchema,
    employees: z.array(companyEmployeeEntrySchema),
  }),
);

/** Response of `getCompanyById()`. */
export type CompanyDetailResponse = z.infer<typeof companyDetailResponseSchema>;

/** `components.schemas.CompanyHistoryEntry` — one company transaction. */
export const companyHistoryEntrySchema = laxObject(
  z.object({
    id: int64Schema,
    companyId: z.string(),
    userId: z.string(),
    amount: int64Schema,
    reason: z.string(),
    tradedAt: dateTimeSchema,
  }),
);

/** One entry returned by `getCompanyHistoryById()`. */
export type CompanyHistoryEntry = z.infer<typeof companyHistoryEntrySchema>;

/** Response body of `getCompanyHistoryById()` (`CompanyHistoryEntry[]`). */
export const companyHistoryResponseSchema = z.array(companyHistoryEntrySchema);
