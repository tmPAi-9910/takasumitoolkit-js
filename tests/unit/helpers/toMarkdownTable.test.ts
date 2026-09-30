import { describe, expect, it } from "vitest";
import { TakasumiBotKitValidationError } from "../../../src/errors";
import { toMarkdownTable } from "../../../src/helpers/toMarkdownTable";

describe("toMarkdownTable", () => {
  it("renders a table from the keys of the first row", () => {
    expect(
      toMarkdownTable([
        { name: "a", age: 1 },
        { name: "b", age: 2 },
      ]),
    ).toBe(["| name | age |", "| --- | --- |", "| a | 1 |", "| b | 2 |"].join("\n"));
  });

  it("returns an empty string for no rows", () => {
    expect(toMarkdownTable([])).toBe("");
  });

  it("honours explicit headers and their order", () => {
    expect(toMarkdownTable([{ a: 1, b: 2 }], { headers: ["b", "a"] })).toBe(
      ["| b | a |", "| --- | --- |", "| 2 | 1 |"].join("\n"),
    );
  });

  it("renders alignment markers", () => {
    expect(toMarkdownTable([{ a: 1, b: 2, c: 3 }], { align: ["left", "center", "right"] })).toBe(
      ["| a | b | c |", "| :--- | :---: | ---: |", "| 1 | 2 | 3 |"].join("\n"),
    );
  });

  it("escapes pipes and line breaks, and renders null as empty", () => {
    expect(toMarkdownTable([{ a: "x|y", b: "l1\nl2", c: null, d: undefined }])).toBe(
      ["| a | b | c | d |", "| --- | --- | --- | --- |", "| x\\|y | l1<br>l2 |  |  |"].join("\n"),
    );
  });

  it("stringifies bigint values", () => {
    expect(toMarkdownTable([{ assets: 1234567n }])).toBe(
      ["| assets |", "| --- |", "| 1234567 |"].join("\n"),
    );
  });

  it("rejects invalid arguments", () => {
    expect(() => toMarkdownTable("nope" as never)).toThrowError(TakasumiBotKitValidationError);
    expect(() => toMarkdownTable([null as never])).toThrowError(TakasumiBotKitValidationError);
    expect(() => toMarkdownTable([{ a: 1 }], { headers: [1 as never] })).toThrowError(
      TakasumiBotKitValidationError,
    );
    expect(() => toMarkdownTable([{ a: 1 }], { align: ["up" as never] })).toThrowError(
      TakasumiBotKitValidationError,
    );
  });
});
