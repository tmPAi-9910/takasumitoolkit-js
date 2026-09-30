/**
 * bigint-safe JSON parsing (**方式 A**).
 *
 * `Response.json()` is deliberately **not** used: it goes through
 * `JSON.parse()`, which turns every integer literal into a IEEE-754 `number`
 * and silently loses precision above `Number.MAX_SAFE_INTEGER` (e.g.
 * `9007199254740993` becomes `9007199254740992`). TakasumiBOT exposes several
 * `format: int64` fields (`assets`, `amount`, `prices`, ...), so the SDK reads
 * the body with `Response.text()` and parses it with the hand written scanner
 * below, which:
 *
 * 1. keeps integer literals that fit in the safe integer range as `number`
 *    (so `format: int32` fields and floats stay untouched);
 * 2. converts integer literals outside that range to `bigint`, preserving every
 *    digit;
 * 3. keeps every other JSON rule identical to `JSON.parse()`.
 *
 * The result is then validated by `zod` (see `src/schemas`).
 */

const INTEGER_LITERAL = /^-?(?:0|[1-9][0-9]*)$/;
const NUMBER_LITERAL = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$/;
const HEX_ESCAPE = /^[0-9a-fA-F]{4}$/;
const ESCAPES: Readonly<Record<string, string>> = {
  '"': '"',
  "\\": "\\",
  "/": "/",
  b: "\b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t",
};

/**
 * Recursive-descent JSON scanner producing `bigint` for large integer literals.
 *
 * The scanner intentionally mirrors `JSON.parse()` semantics (duplicate keys:
 * last one wins; lone surrogates are preserved as-is; malformed input throws a
 * `SyntaxError`).
 */
class JsonScanner {
  private index = 0;

  constructor(private readonly source: string) {}

  /** Parses a complete JSON document. */
  parseDocument(): unknown {
    this.skipWhitespace();
    const value = this.parseValue();
    this.skipWhitespace();
    if (this.index < this.source.length) {
      throw this.fail("Unexpected trailing content");
    }
    return value;
  }

  private fail(reason: string): SyntaxError {
    return new SyntaxError(`Invalid JSON at position ${this.index}: ${reason}`);
  }

  private skipWhitespace(): void {
    while (this.index < this.source.length) {
      const char = this.source[this.index];
      if (char === " " || char === "\t" || char === "\n" || char === "\r") {
        this.index += 1;
        continue;
      }
      return;
    }
  }

  private peek(): string | undefined {
    return this.source[this.index];
  }

  private parseValue(): unknown {
    const char = this.peek();
    if (char === undefined) {
      throw this.fail("Unexpected end of input");
    }
    switch (char) {
      case "{":
        return this.parseObject();
      case "[":
        return this.parseArray();
      case '"':
        return this.parseString();
      case "t":
        return this.parseLiteral("true", true);
      case "f":
        return this.parseLiteral("false", false);
      case "n":
        return this.parseLiteral("null", null);
      default:
        return this.parseNumber();
    }
  }

  private parseLiteral<T extends boolean | null>(literal: string, value: T): T {
    if (this.source.startsWith(literal, this.index)) {
      this.index += literal.length;
      return value;
    }
    throw this.fail(`Expected literal "${literal}"`);
  }

  private parseObject(): Record<string, unknown> {
    this.index += 1; // consume '{'
    const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    this.skipWhitespace();
    if (this.peek() === "}") {
      this.index += 1;
      return result;
    }
    for (;;) {
      this.skipWhitespace();
      if (this.peek() !== '"') {
        throw this.fail('Expected a string key or "}"');
      }
      const key = this.parseString();
      this.skipWhitespace();
      if (this.peek() !== ":") {
        throw this.fail('Expected ":"');
      }
      this.index += 1;
      this.skipWhitespace();
      result[key] = this.parseValue();
      this.skipWhitespace();
      const char = this.peek();
      if (char === ",") {
        this.index += 1;
        continue;
      }
      if (char === "}") {
        this.index += 1;
        return result;
      }
      throw this.fail('Expected "," or "}"');
    }
  }

  private parseArray(): unknown[] {
    this.index += 1; // consume '['
    const result: unknown[] = [];
    this.skipWhitespace();
    if (this.peek() === "]") {
      this.index += 1;
      return result;
    }
    for (;;) {
      this.skipWhitespace();
      result.push(this.parseValue());
      this.skipWhitespace();
      const char = this.peek();
      if (char === ",") {
        this.index += 1;
        continue;
      }
      if (char === "]") {
        this.index += 1;
        return result;
      }
      throw this.fail('Expected "," or "]"');
    }
  }

  private parseString(): string {
    this.index += 1; // consume opening quote
    let out = "";
    for (;;) {
      const char = this.source[this.index];
      if (char === undefined) {
        throw this.fail("Unterminated string");
      }
      if (char === '"') {
        this.index += 1;
        return out;
      }
      if (char === "\\") {
        this.index += 1;
        const escaped = this.source[this.index];
        if (escaped === undefined) {
          throw this.fail("Unterminated escape sequence");
        }
        if (escaped === "u") {
          const hex = this.source.slice(this.index + 1, this.index + 5);
          if (!HEX_ESCAPE.test(hex)) {
            throw this.fail("Invalid unicode escape sequence");
          }
          out += String.fromCharCode(Number.parseInt(hex, 16));
          this.index += 5;
          continue;
        }
        const replacement = ESCAPES[escaped];
        if (replacement === undefined) {
          throw this.fail(`Invalid escape sequence "\\${escaped}"`);
        }
        out += replacement;
        this.index += 1;
        continue;
      }
      // Reject raw control characters, like JSON.parse does.
      const code = char.charCodeAt(0);
      if (code < 0x20) {
        throw this.fail("Unescaped control character in string");
      }
      out += char;
      this.index += 1;
    }
  }

  private parseNumber(): number | bigint {
    const start = this.index;
    if (this.peek() === "-") {
      this.index += 1;
    }
    this.consumeDigits("Expected digits");
    if (this.peek() === ".") {
      this.index += 1;
      this.consumeDigits("Expected digits after decimal point");
    }
    const exponent = this.peek();
    if (exponent === "e" || exponent === "E") {
      this.index += 1;
      const sign = this.peek();
      if (sign === "+" || sign === "-") {
        this.index += 1;
      }
      this.consumeDigits("Expected digits in exponent");
    }
    const literal = this.source.slice(start, this.index);
    if (!NUMBER_LITERAL.test(literal)) {
      throw this.fail(`Invalid number literal "${literal}"`);
    }
    if (!INTEGER_LITERAL.test(literal)) {
      return Number(literal);
    }
    const asNumber = Number(literal);
    // Precision is only preserved when the value survives the round trip;
    // anything larger is emitted as a bigint so no digit is lost.
    return Number.isSafeInteger(asNumber) ? asNumber : BigInt(literal);
  }

  private consumeDigits(reason: string): void {
    const start = this.index;
    while (this.index < this.source.length) {
      const code = this.source.charCodeAt(this.index);
      if (code < 0x30 || code > 0x39) {
        break;
      }
      this.index += 1;
    }
    if (this.index === start) {
      throw this.fail(reason);
    }
  }
}

/**
 * Parses a JSON document, returning `bigint` for integer literals that exceed
 * the safe integer range.
 *
 * @param text - Raw response body (never obtained through `Response.json()`).
 * @returns The parsed value (`null`, `boolean`, `number`, `bigint`, `string`,
 *   `Array` or plain object).
 * @throws {SyntaxError} When `text` is not valid JSON.
 *
 * @example
 * ```ts
 * const parsed = parseJsonWithBigInt('{"amount":9007199254740993}');
 * parsed.amount; // 9007199254740993n (bigint, no precision loss)
 * ```
 */
export function parseJsonWithBigInt(text: string): unknown {
  return new JsonScanner(text).parseDocument();
}
