import { z } from "zod";
import { int64Schema, laxObject, numberSchema } from "./common";

/** `components.schemas.TaxRateEntry` — one bracket of a progressive tax. */
export const taxRateEntrySchema = laxObject(
  z.object({
    threshold: numberSchema,
    rate: numberSchema,
  }),
);

/** One bracket of a progressive tax. */
export type TaxRateEntry = z.infer<typeof taxRateEntrySchema>;

/** `components.schemas.TaxResponse` — every tax rate exposed by the API. */
export const taxResponseSchema = laxObject(
  z.object({
    benefitTax: z.array(taxRateEntrySchema),
    companyBenefitTax: z.array(taxRateEntrySchema),
    debtInterestRate: numberSchema,
    depositInterestRate: numberSchema,
    depositTaxRate: numberSchema,
    exchangeTaxRate: numberSchema,
    giftTaxRate: numberSchema,
    idleTax: int64Schema,
    incomeTaxRate: numberSchema,
    tradeTaxRate: numberSchema,
  }),
);

/** Response of `getTaxInfo()`. */
export type TaxResponse = z.infer<typeof taxResponseSchema>;
