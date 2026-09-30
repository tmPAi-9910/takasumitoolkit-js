import { describe, expect, it } from "vitest";
import type { components } from "../../../src/generated/openapi";
import { API_PATHS } from "../../../src/api/paths";
import openapiDocument from "../../../TakasumiBOT-OpenAPI-Document.json";
import type {
  CompanyDetailResponse,
  CompanyEmployeeEntry,
  CompanyHistoryEntry,
  CompanyListEntry,
  CompanyStatistics,
  DiscordUserSearchResponse,
  GiftResponse,
  HistoryEntry,
  ProfileResponse,
  RankingEntry,
  ShardDataEntry,
  ShardResponse,
  StatisticsResponse,
  StatusEntry,
  StockEntry,
  TaxRateEntry,
  TaxResponse,
} from "../../../src/schemas";

/** Compile time assertion helper. */
type Expect<T extends true> = T;

/** `true` when `A` and `B` expose exactly the same property names. */
type SameKeys<A, B> = [keyof A] extends [keyof B]
  ? [keyof B] extends [keyof A]
    ? true
    : false
  : false;

// Every public response type must expose exactly the fields of the matching
// OpenAPI schema. `int64` fields differ on purpose (number → bigint), the key
// sets must not.
type AssertGift = Expect<SameKeys<GiftResponse, components["schemas"]["GiftResponse"]>>;
type AssertRanking = Expect<SameKeys<RankingEntry, components["schemas"]["RankingEntry"]>>;
type AssertProfile = Expect<SameKeys<ProfileResponse, components["schemas"]["ProfileResponse"]>>;
type AssertHistory = Expect<SameKeys<HistoryEntry, components["schemas"]["HistoryEntry"]>>;
type AssertCompanyList = Expect<
  SameKeys<CompanyListEntry, components["schemas"]["CompanyListEntry"]>
>;
type AssertCompanyEmployee = Expect<
  SameKeys<CompanyEmployeeEntry, components["schemas"]["CompanyEmployeeEntry"]>
>;
type AssertCompanyStatistics = Expect<
  SameKeys<CompanyStatistics, components["schemas"]["CompanyStatistics"]>
>;
type AssertCompanyDetail = Expect<
  SameKeys<CompanyDetailResponse, components["schemas"]["CompanyDetailResponse"]>
>;
type AssertStock = Expect<SameKeys<StockEntry, components["schemas"]["StockEntry"]>>;
type AssertTaxRate = Expect<SameKeys<TaxRateEntry, components["schemas"]["TaxRateEntry"]>>;
type AssertTax = Expect<SameKeys<TaxResponse, components["schemas"]["TaxResponse"]>>;
type AssertShardData = Expect<SameKeys<ShardDataEntry, components["schemas"]["ShardDataEntry"]>>;
type AssertShard = Expect<SameKeys<ShardResponse, components["schemas"]["ShardResponse"]>>;
type AssertStatus = Expect<SameKeys<StatusEntry, components["schemas"]["StatusEntry"]>>;
type AssertDiscord = Expect<
  SameKeys<DiscordUserSearchResponse, components["schemas"]["DiscordUserSearchResponse"]>
>;
type AssertCompanyHistory = Expect<
  SameKeys<CompanyHistoryEntry, components["schemas"]["CompanyHistoryEntry"]>
>;
type AssertStatistics = Expect<
  SameKeys<StatisticsResponse, components["schemas"]["StatisticsResponse"]>
>;
type AssertStatisticsEvent = Expect<
  SameKeys<
    StatisticsResponse["event"]["messageCreate"],
    NonNullable<NonNullable<components["schemas"]["StatisticsResponse"]["event"]>["messageCreate"]>
  >
>;

/**
 * Exported so that the compile time assertions above are "used": the build
 * fails when a public type stops matching the generated OpenAPI schema.
 */
export type SchemaAssertions = [
  AssertGift,
  AssertRanking,
  AssertProfile,
  AssertHistory,
  AssertCompanyList,
  AssertCompanyEmployee,
  AssertCompanyStatistics,
  AssertCompanyDetail,
  AssertStock,
  AssertTaxRate,
  AssertTax,
  AssertShardData,
  AssertShard,
  AssertStatus,
  AssertDiscord,
  AssertCompanyHistory,
  AssertStatistics,
  AssertStatisticsEvent,
];

const declaredPaths: Record<string, Record<string, unknown>> = openapiDocument.paths;
const httpMethods = new Set(["get", "put", "post", "delete", "options", "head", "patch", "trace"]);

describe("OpenAPI consistency", () => {
  it("only uses paths declared in the OpenAPI document", () => {
    for (const template of Object.values(API_PATHS)) {
      expect(Object.keys(declaredPaths)).toContain(template);
    }
  });

  it("covers every HTTP path of the OpenAPI document", () => {
    const implemented = new Set<string>(Object.values(API_PATHS));
    const expected = Object.entries(declaredPaths)
      .filter(([, operations]) => Object.keys(operations).some((method) => httpMethods.has(method)))
      .map(([path]) => path);

    expect(expected.sort()).toEqual([...implemented].sort());
  });

  it("does not implement the WebSocket endpoint", () => {
    expect(Object.values(API_PATHS)).not.toContain("/v3/realtime/");
    expect(Object.keys(declaredPaths)).toContain("/v3/realtime/");
    // The realtime path is the only one carrying a `ws` operation.
    const realtime = declaredPaths["/v3/realtime/"];
    expect(realtime).toBeDefined();
    expect(Object.keys(realtime ?? {}).some((method) => httpMethods.has(method))).toBe(false);
  });

  it("keeps one schema per OpenAPI component schema", () => {
    expect(Object.keys(openapiDocument.components.schemas)).toHaveLength(17);
  });
});
