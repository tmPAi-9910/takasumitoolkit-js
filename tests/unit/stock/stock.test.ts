import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createKitClient } from "../../../src/client/createKitClient";
import { TakasumiBotKitHttpError, TakasumiBotKitValidationError } from "../../../src/errors";
import { createMockFetch } from "../../helpers/mockFetch";
import { stockEntries } from "../../helpers/fixtures";

const stockFetch = () => createMockFetch([{ body: stockEntries }]);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getStockInfoById", () => {
  it("finds a stock from the list without any extra request", async () => {
    const fetch = stockFetch();
    const kit = createKitClient({ fetch });

    const stock = await kit.getStockInfoById("JTTI");
    expect(stock).toMatchObject({ id: "JTTI", name: "JTTI", dividendAmount: 120n });
    expect(fetch.callCount).toBe(1);
    expect(fetch.lastUrl).toBe("https://api.takasumibot.com/v3/stock");
  });

  it("throws STOCK_NOT_FOUND for an unknown id", async () => {
    const kit = createKitClient({ fetch: stockFetch() });
    const error = await kit.getStockInfoById("NOPE").catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(TakasumiBotKitValidationError);
    expect(error).toMatchObject({ code: "STOCK_NOT_FOUND", field: "id", retryable: false });
  });

  it("rejects a blank id before any request", async () => {
    const fetch = stockFetch();
    const kit = createKitClient({ fetch });
    const error = await kit.getStockInfoById("   ").catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(TakasumiBotKitValidationError);
    expect(error).toMatchObject({ code: "INVALID_STOCK_ID" });
    expect(fetch.callCount).toBe(0);
  });

  it("propagates transport errors", async () => {
    const fetch = createMockFetch([{ status: 500, body: {} }]);
    const kit = createKitClient({ fetch, retry: { maxRetries: 0 } });
    await expect(kit.getStockInfoById("JTTI")).rejects.toBeInstanceOf(TakasumiBotKitHttpError);
  });
});

describe("getStockPriceById", () => {
  it("returns the newest price (last element)", async () => {
    const kit = createKitClient({ fetch: stockFetch() });
    await expect(kit.getStockPriceById("JTTI")).resolves.toBe(103n);
  });

  it("returns null for an empty price history", async () => {
    const kit = createKitClient({ fetch: stockFetch() });
    await expect(kit.getStockPriceById("KENTAI")).resolves.toBeNull();
  });

  it("fails for an unknown id", async () => {
    const kit = createKitClient({ fetch: stockFetch() });
    await expect(kit.getStockPriceById("NOPE")).rejects.toBeInstanceOf(
      TakasumiBotKitValidationError,
    );
  });
});

describe("getStockHistoryById", () => {
  it("returns the whole history newest first when no limit is given", async () => {
    const kit = createKitClient({ fetch: stockFetch() });
    await expect(kit.getStockHistoryById("JTTI")).resolves.toEqual([103n, 102n, 101n, 100n]);
  });

  it("returns [] for limit 0", async () => {
    const kit = createKitClient({ fetch: stockFetch() });
    await expect(kit.getStockHistoryById("JTTI", { limit: 0 })).resolves.toEqual([]);
  });

  it("returns the newest n prices for a positive limit", async () => {
    const kit = createKitClient({ fetch: stockFetch() });
    await expect(kit.getStockHistoryById("JTTI", { limit: 2 })).resolves.toEqual([103n, 102n]);
  });

  it("returns everything when the limit exceeds the history", async () => {
    const kit = createKitClient({ fetch: stockFetch() });
    await expect(kit.getStockHistoryById("JTTI", { limit: 99 })).resolves.toEqual([
      103n,
      102n,
      101n,
      100n,
    ]);
  });

  it("rejects a negative, NaN or non integer limit", async () => {
    const kit = createKitClient({ fetch: stockFetch() });
    for (const limit of [-1, Number.NaN, 1.5]) {
      const error = await kit
        .getStockHistoryById("JTTI", { limit })
        .catch((thrown: unknown) => thrown);
      expect(error).toBeInstanceOf(TakasumiBotKitValidationError);
      expect(error).toMatchObject({ code: "INVALID_LIMIT", field: "limit", value: limit });
    }
  });

  it("never mutates the underlying prices array", async () => {
    const kit = createKitClient({ fetch: stockFetch() });
    await kit.getStockHistoryById("JTTI", { limit: 2 });
    const stocks = await kit.getStockList();
    expect(stocks[0]?.prices).toEqual([100n, 101n, 102n, 103n]);
  });
});

describe("getStock() builder", () => {
  it("exposes the same results as the individual functions", async () => {
    const kit = createKitClient({ fetch: stockFetch() });
    await expect(kit.getStock().id("JTTI").info()).resolves.toMatchObject({ id: "JTTI" });
    await expect(kit.getStock().id("JTTI").price()).resolves.toBe(103n);
    await expect(kit.getStock().id("JTTI").history({ limit: 3 })).resolves.toEqual([
      103n,
      102n,
      101n,
    ]);
  });

  it("validates the id eagerly in id()", () => {
    const fetch = stockFetch();
    const kit = createKitClient({ fetch });
    expect(() => kit.getStock().id("")).toThrowError(TakasumiBotKitValidationError);
    expect(fetch.callCount).toBe(0);
  });

  it("is lazy: no request until a terminal method is awaited", () => {
    const fetch = stockFetch();
    const kit = createKitClient({ fetch });
    const builder = kit.getStock().id("JTTI");
    expect(fetch.callCount).toBe(0);
    void builder.price();
  });

  it("returns a new immutable builder per call", () => {
    const kit = createKitClient({ fetch: stockFetch() });
    expect(kit.getStock()).not.toBe(kit.getStock());
    expect(kit.getStock().id("JTTI")).not.toBe(kit.getStock().id("JTTI"));
  });
});

describe("stockCache", () => {
  it("is disabled by default: every call performs a request", async () => {
    const fetch = stockFetch();
    const kit = createKitClient({ fetch });

    await kit.getStockList();
    await kit.getStockList();
    await kit.getStockInfoById("JTTI");
    expect(fetch.callCount).toBe(3);
  });

  it("can be enabled with {} and defaults to a 60 s TTL", async () => {
    const fetch = stockFetch();
    const kit = createKitClient({ fetch, stockCache: {} });

    await kit.getStockList();
    await kit.getStockList();
    expect(fetch.callCount).toBe(1);

    await vi.advanceTimersByTimeAsync(59_000);
    await kit.getStockList();
    expect(fetch.callCount).toBe(1);

    await vi.advanceTimersByTimeAsync(1_500);
    await kit.getStockList();
    expect(fetch.callCount).toBe(2);
  });

  it("honours a custom TTL", async () => {
    const fetch = stockFetch();
    const kit = createKitClient({ fetch, stockCache: { ttlMs: 1_000 } });

    await kit.getStockList();
    await kit.getStock().id("JTTI").price();
    expect(fetch.callCount).toBe(1);

    await vi.advanceTimersByTimeAsync(1_500);
    await kit.getStock().id("JTTI").price();
    expect(fetch.callCount).toBe(2);
  });

  it("is scoped to the client instance", async () => {
    const first = stockFetch();
    const second = stockFetch();
    const kitA = createKitClient({ fetch: first, stockCache: {} });
    const kitB = createKitClient({ fetch: second, stockCache: {} });

    await kitA.getStockList();
    await kitA.getStockList();
    await kitB.getStockList();
    expect(first.callCount).toBe(1);
    expect(second.callCount).toBe(1);
  });

  it("shares one in-flight request between concurrent missis", async () => {
    const fetch = stockFetch();
    const kit = createKitClient({ fetch, stockCache: { ttlMs: 60_000 } });

    const [a, b] = await Promise.all([kit.getStockList(), kit.getStockList()]);
    expect(a).toEqual(b);
    expect(fetch.callCount).toBe(1);
  });

  it("does not cache when explicitly disabled with false", async () => {
    const fetch = stockFetch();
    const kit = createKitClient({ fetch, stockCache: false });

    await kit.getStockList();
    await kit.getStockList();
    expect(fetch.callCount).toBe(2);
  });
});
