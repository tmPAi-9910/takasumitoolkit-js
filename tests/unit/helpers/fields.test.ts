import { describe, expect, it } from "vitest";
import { TakasumiBotKitValidationError } from "../../../src/errors";
import { omitFields, pickFields } from "../../../src/helpers/pickFields";

describe("pickFields", () => {
  it("keeps only the requested keys", () => {
    expect(pickFields({ a: 1, b: 2, c: 3 }, ["a", "c"])).toEqual({ a: 1, c: 3 });
  });

  it("ignores keys that are not own properties", () => {
    expect(pickFields({ a: 1 }, ["a", "missing" as never])).toEqual({ a: 1 });
  });

  it("does not mutate the source", () => {
    const source = { a: 1, b: 2 };
    pickFields(source, ["a"]);
    expect(source).toEqual({ a: 1, b: 2 });
  });

  it("never copies dangerous keys", () => {
    const result = pickFields({ a: 1 }, ["__proto__" as never, "constructor" as never]);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("rejects invalid arguments", () => {
    expect(() => pickFields(null as never, ["a"])).toThrowError(TakasumiBotKitValidationError);
    expect(() => pickFields({ a: 1 }, "a" as never)).toThrowError(TakasumiBotKitValidationError);
  });
});

describe("omitFields", () => {
  it("drops the requested keys", () => {
    expect(omitFields({ a: 1, b: 2, c: 3 }, ["b"])).toEqual({ a: 1, c: 3 });
  });

  it("does not mutate the source", () => {
    const source = { a: 1, b: 2 };
    omitFields(source, ["b"]);
    expect(source).toEqual({ a: 1, b: 2 });
  });

  it("ignores unknown keys", () => {
    expect(omitFields({ a: 1 }, ["missing" as never])).toEqual({ a: 1 });
  });

  it("rejects invalid arguments", () => {
    expect(() => omitFields(undefined as never, ["a"])).toThrowError(TakasumiBotKitValidationError);
    expect(() => omitFields({ a: 1 }, "a" as never)).toThrowError(TakasumiBotKitValidationError);
  });
});
