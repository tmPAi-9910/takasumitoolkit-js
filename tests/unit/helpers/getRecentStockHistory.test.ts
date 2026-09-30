import { describe, expect, it } from "vitest";
import { TakasumiBotKitValidationError } from "../../../src/errors";
import { getRecentStockHistory } from "../../../src/helpers/getRecentStockHistory";

describe("getRecentStockHistory", () => {
  it("returns the whole history newest first when no limit is given", () => {
    expect(getRecentStockHistory([100, 101, 102])).toEqual([102, 101, 100]);
  });

  it("returns the newest n entries", () => {
    expect(getRecentStockHistory([100, 101, 102, 103], 2)).toEqual([103, 102]);
  });

  it("returns [] for limit 0", () => {
    expect(getRecentStockHistory([100, 101, 102], 0)).toEqual([]);
  });

  it("rejects a negative, NaN or non integer limit", () => {
    for (const limit of [-1, Number.NaN, 1.5]) {
      expect(() => getRecentStockHistory([1, 2], limit)).toThrowError(
        TakasumiBotKitValidationError,
      );
    }
  });

  it("supports bigint histories", () => {
    expect(getRecentStockHistory([100n, 101n, 102n], 2)).toEqual([102n, 101n]);
  });

  it("never mutates the input", () => {
    const history = [100, 101, 102];
    getRecentStockHistory(history, 2);
    expect(history).toEqual([100, 101, 102]);
  });

  it("rejects invalid histories", () => {
    expect(() => getRecentStockHistory("nope" as never)).toThrowError(
      TakasumiBotKitValidationError,
    );
    expect(() => getRecentStockHistory([1, "2" as never])).toThrowError(
      TakasumiBotKitValidationError,
    );
    expect(() => getRecentStockHistory([Number.NaN])).toThrowError(TakasumiBotKitValidationError);
  });

  it("applies the same rules as getStockHistoryById", async () => {
    const { createKitClient } = await import("../../../src/client/createKitClient");
    const { createMockFetch } = await import("../../helpers/mockFetch");
    const kit = createKitClient({
      fetch: createMockFetch([
        {
          body: [
            {
              name: "JTTI",
              id: "JTTI",
              description: "",
              dividendAmount: 0,
              dividendRate: 0,
              prices: [100, 101, 102, 103],
            },
          ],
        },
      ]),
    });

    const history = await kit.getStockHistoryById("JTTI", { limit: 2 });
    expect(history).toEqual(getRecentStockHistory([100n, 101n, 102n, 103n], 2));
  });
});
