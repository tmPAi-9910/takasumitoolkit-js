import { describe, expect, it } from "vitest";
import { createKitClient } from "../../../src/client/createKitClient";
import { TakasumiBotKitValidationError } from "../../../src/errors";
import { createMockFetch } from "../../helpers/mockFetch";
import {
  companyDetailResponse,
  companyHistoryEntries,
  companyListEntries,
  discordUserSearchResponse,
  giftResponse,
  historyEntries,
  profileResponse,
  rankingEntries,
  shardResponse,
  statisticsResponse,
  statusEntries,
  stockEntries,
  taxResponse,
} from "../../helpers/fixtures";

/** Every endpoint, its fixture and the URL it must produce. */
const cases: ReadonlyArray<{
  readonly name: string;
  readonly url: string;
  readonly body: unknown;
  readonly call: (kit: ReturnType<typeof createKitClient>) => Promise<unknown>;
  readonly expect?: (result: unknown) => void;
}> = [
  {
    name: "getGiftInfo",
    url: "https://api.takasumibot.com/v3/gift/Abc123Xyz0",
    body: giftResponse,
    call: (kit) => kit.getGiftInfo("Abc123Xyz0"),
    expect: (result) => {
      expect(result).toMatchObject({ id: "Abc123Xyz0", amount: 1000n, receiverId: null });
    },
  },
  {
    name: "getTaxInfo",
    url: "https://api.takasumibot.com/v3/tax",
    body: taxResponse,
    call: (kit) => kit.getTaxInfo(),
    expect: (result) => {
      const tax = result as { idleTax: bigint; benefitTax: Array<{ rate: number }> };
      expect(tax.idleTax).toBe(50000n);
      expect(tax.benefitTax).toHaveLength(2);
      expect(tax.benefitTax[0]?.rate).toBe(0.05);
    },
  },
  {
    name: "getShardInfo",
    url: "https://api.takasumibot.com/v3/shard",
    body: shardResponse,
    call: (kit) => kit.getShardInfo(),
    expect: (result) => {
      const shard = result as { data: Array<{ shardId: string; ping: string }> };
      expect(shard.data).toHaveLength(2);
      expect(shard.data[0]?.ping).toBe("42");
    },
  },
  {
    name: "getStatisticsInfo",
    url: "https://api.takasumibot.com/v3/statistics",
    body: statisticsResponse,
    call: (kit) => kit.getStatisticsInfo(),
    expect: (result) => {
      expect(result).toMatchObject({ economy: { treasury: 9000000n } });
    },
  },
  {
    name: "getHistoryById",
    url: "https://api.takasumibot.com/v3/history/123456789012345678",
    body: historyEntries,
    call: (kit) => kit.getHistoryById("123456789012345678"),
    expect: (result) => {
      expect(Array.isArray(result)).toBe(true);
      expect((result as unknown[])[0]).toMatchObject({ amount: 500n });
    },
  },
  {
    name: "getProfileById",
    url: "https://api.takasumibot.com/v3/profile/123456789012345678",
    body: profileResponse,
    call: (kit) => kit.getProfileById("123456789012345678"),
    expect: (result) => {
      expect(result).toMatchObject({ assets: 1234567n, jobType: "engineer" });
    },
  },
  {
    name: "getRanking",
    url: "https://api.takasumibot.com/v3/ranking",
    body: rankingEntries,
    call: (kit) => kit.getRanking(),
    expect: (result) => {
      expect((result as unknown[]).length).toBe(2);
    },
  },
  {
    name: "getCompanyList",
    url: "https://api.takasumibot.com/v3/companylist",
    body: companyListEntries,
    call: (kit) => kit.getCompanyList(),
    expect: (result) => {
      expect(result).toMatchObject([{ id: "Abc123Xyz0", salary: 5000n }]);
    },
  },
  {
    name: "getCompanyById",
    url: "https://api.takasumibot.com/v3/company/Abc123Xyz0",
    body: companyDetailResponse,
    call: (kit) => kit.getCompanyById("Abc123Xyz0"),
    expect: (result) => {
      expect(result).toMatchObject({ statistics: { totalEarn: 300000n } });
    },
  },
  {
    name: "getStockList",
    url: "https://api.takasumibot.com/v3/stock",
    body: stockEntries,
    call: (kit) => kit.getStockList(),
    expect: (result) => {
      const stocks = result as Array<{ id: string; prices: bigint[] }>;
      expect(stocks[0]?.id).toBe("JTTI");
      expect(stocks[0]?.prices).toEqual([100n, 101n, 102n, 103n]);
    },
  },
  {
    name: "getDiscordUserByName",
    url: "https://api.takasumibot.com/v3/discord/usersearch/takasumi",
    body: discordUserSearchResponse,
    call: (kit) => kit.getDiscordUserByName("takasumi"),
    expect: (result) => {
      expect(result).toMatchObject({ username: "takasumi", bot: false, globalName: "Takasumi" });
    },
  },
  {
    name: "getCompanyHistoryById",
    url: "https://api.takasumibot.com/v3/companyHistory/Abc123Xyz0",
    body: companyHistoryEntries,
    call: (kit) => kit.getCompanyHistoryById("Abc123Xyz0"),
    expect: (result) => {
      expect(result).toMatchObject([{ amount: 5000n, companyId: "Abc123Xyz0" }]);
    },
  },
  {
    name: "getStatus",
    url: "https://api.takasumibot.com/v3/status",
    body: statusEntries,
    call: (kit) => kit.getStatus(),
    expect: (result) => {
      expect(result).toMatchObject([{ ping: 42, totalUser: 3400n }]);
    },
  },
];

describe("HTTP endpoints", () => {
  for (const testCase of cases) {
    it(`${testCase.name} calls ${testCase.url}`, async () => {
      const fetch = createMockFetch([{ body: testCase.body }]);
      const kit = createKitClient({ fetch });

      const result = await testCase.call(kit);
      expect(fetch.lastUrl).toBe(testCase.url);
      testCase.expect?.(result);
    });
  }

  it("validates the gift id before sending a request", async () => {
    const fetch = createMockFetch([{ body: giftResponse }]);
    const kit = createKitClient({ fetch });

    const error = await kit.getGiftInfo("short").catch((thrown: unknown) => thrown);
    expect(error).toBeInstanceOf(TakasumiBotKitValidationError);
    expect(error).toMatchObject({ code: "INVALID_GIFT_ID", field: "id" });
    expect(fetch.callCount).toBe(0);
  });

  it("accepts every 10 character alphanumeric gift id", async () => {
    const fetch = createMockFetch([{ body: giftResponse }]);
    const kit = createKitClient({ fetch });
    await kit.getGiftInfo("AAAA000000");
    expect(fetch.lastUrl).toBe("https://api.takasumibot.com/v3/gift/AAAA000000");
  });

  const blankCases: ReadonlyArray<[string, (kit: ReturnType<typeof createKitClient>) => unknown]> =
    [
      ["getHistoryById", (kit) => kit.getHistoryById("   ")],
      ["getProfileById", (kit) => kit.getProfileById("")],
      ["getCompanyById", (kit) => kit.getCompanyById(" ")],
      ["getCompanyHistoryById", (kit) => kit.getCompanyHistoryById("")],
      ["getDiscordUserByName", (kit) => kit.getDiscordUserByName("   ")],
    ];

  for (const [name, call] of blankCases) {
    it(`rejects a blank argument in ${name}`, async () => {
      const fetch = createMockFetch([{ body: {} }]);
      const kit = createKitClient({ fetch });
      await expect(call(kit)).rejects.toBeInstanceOf(TakasumiBotKitValidationError);
      expect(fetch.callCount).toBe(0);
    });
  }
});
