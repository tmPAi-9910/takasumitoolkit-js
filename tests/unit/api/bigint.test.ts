import { describe, expect, it } from "vitest";
import { createKitClient } from "../../../src/client/createKitClient";
import { createMockFetch } from "../../helpers/mockFetch";
import { parseJsonWithBigInt } from "../../../src/internal/json";
import { giftResponse } from "../../helpers/fixtures";

describe("bigint parsing (方式 A)", () => {
  it("keeps integers above Number.MAX_SAFE_INTEGER intact", () => {
    const parsed = parseJsonWithBigInt(
      '{"a":9007199254740993,"b":-9007199254740993,"c":9007199254740991}',
    ) as Record<string, unknown>;
    expect(parsed["a"]).toBe(9007199254740993n);
    expect(parsed["b"]).toBe(-9007199254740993n);
    // still inside the safe range → stays a number
    expect(parsed["c"]).toBe(9007199254740991);
  });

  it("keeps floats, booleans, null and strings untouched", () => {
    const parsed = parseJsonWithBigInt(
      '{"f":0.5,"e":1e3,"t":true,"n":null,"s":"9007199254740993","neg":-1.25e-3}',
    ) as Record<string, unknown>;
    expect(parsed["f"]).toBe(0.5);
    expect(parsed["e"]).toBe(1000);
    expect(parsed["t"]).toBe(true);
    expect(parsed["n"]).toBeNull();
    expect(parsed["s"]).toBe("9007199254740993");
    expect(parsed["neg"]).toBe(-0.00125);
  });

  it("parses nested structures and unicode escapes", () => {
    const parsed = parseJsonWithBigInt(
      '{"list":[1,{"deep":12345678901234567890}],"s":"\\u00e9\\n\\"q\\""}',
    ) as Record<string, unknown>;
    const list = parsed["list"] as Array<Record<string, unknown>>;
    expect(list[1]?.["deep"]).toBe(12345678901234567890n);
    expect(parsed["s"]).toBe('é\n"q"');
  });

  it("throws a SyntaxError on malformed input", () => {
    expect(() => parseJsonWithBigInt("{")).toThrowError(SyntaxError);
    expect(() => parseJsonWithBigInt('{"a":01}')).toThrowError(SyntaxError);
    expect(() => parseJsonWithBigInt('{"a":1,}')).toThrowError(SyntaxError);
    expect(() => parseJsonWithBigInt('{"a" 1}')).toThrowError(SyntaxError);
    expect(() => parseJsonWithBigInt('{"a":1} trailing')).toThrowError(SyntaxError);
  });

  it("never loses precision end to end (Response.text + custom parse)", async () => {
    // Built by hand on purpose: JSON.stringify() would already lose precision.
    const rawBody = [
      "{",
      '"type":"gift",',
      '"id":"Abc123Xyz0",',
      '"userId":"123456789012345678",',
      '"status":"unused",',
      '"receiverId":null,',
      '"amount":9007199254740993,',
      '"boughtAt":null,',
      '"createdAt":"2024-01-01T00:00:00.000Z"',
      "}",
    ].join("");
    const fetch = createMockFetch([{ rawBody }]);
    const kit = createKitClient({ fetch });

    const gift = await kit.getGiftInfo("Abc123Xyz0");
    expect(gift.amount).toBe(9007199254740993n);
    // a plain JSON.parse would have produced 9007199254740992
    expect(gift.amount).not.toBe(9007199254740992n);
    expect(typeof gift.amount).toBe("bigint");
    expect(gift.createdAt).toBe("2024-01-01T00:00:00.000Z");
    expect(giftResponse.id).toBe("Abc123Xyz0");
  });

  it("returns int64 fields as bigint even when they are small", async () => {
    const fetch = createMockFetch([{ body: giftResponse }]);
    const kit = createKitClient({ fetch });

    const gift = await kit.getGiftInfo("Abc123Xyz0");
    expect(gift.amount).toBe(1000n);
  });

  it("keeps int32 fields as numbers", async () => {
    const fetch = createMockFetch([
      {
        body: [
          {
            id: 1,
            ping: 42,
            totalUser: 3400,
            totalGuild: 238,
            totalCommand: 98765,
            cpuUsage: 12,
            memoryUsage: 34,
            loggedAt: "2024-01-01T00:00:00.000Z",
          },
        ],
      },
    ]);
    const kit = createKitClient({ fetch });

    const status = await kit.getStatus();
    expect(status[0]?.ping).toBe(42);
    expect(typeof status[0]?.ping).toBe("number");
    expect(status[0]?.totalUser).toBe(3400n);
  });
});
