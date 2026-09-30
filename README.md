# takasumibot-kit

TypeScript client SDK for the **TakasumiBOT public API (v3)**.

- Strict TypeScript, Node.js 20+ (Bun works too), global `fetch`
- `zod` is the only runtime dependency
- ESM + CommonJS + `.d.ts` builds
- Exponential backoff retries, timeouts, structured errors, opt-in caching
- `bigint` for every `format: int64` field (no precision loss)
- No authentication (the API is public), no WebSocket client

The OpenAPI document shipped in this repository
(`TakasumiBOT-OpenAPI-Document.json`) is the single source of truth: every
method maps to one declared HTTP path, and nothing else is called.

> The WebSocket endpoint `/v3/realtime/` is intentionally **not** implemented.

## Install

```bash
npm install takasumibot-kit
# pnpm add takasumibot-kit
# yarn add takasumibot-kit
# bun add takasumibot-kit
```

Requires Node.js 20 or newer (a global `fetch` implementation is mandatory).

## Quick start

```ts
import { createKitClient } from "takasumibot-kit";

const kit = createKitClient();

const tax = await kit.getTaxInfo();
const ranking = await kit.getRanking();
const profile = await kit.getProfileById("123456789012345678");

console.log(tax.incomeTaxRate); // number
console.log(profile.assets); // bigint
```

Everything is also available from a single client instance; there is no global
state, and clients are safe to create per request or per process.

## Configuration (`basicConfig`)

```ts
const kit = createKitClient({
  timeoutMs: 10_000,
  headers: { "user-agent": "my-bot/1.0.0" },
  retry: { maxRetries: 3, initialDelayMs: 300, maxDelayMs: 5_000, backoffFactor: 2, jitter: true },
  fetch: myCustomFetch, // defaults to globalThis.fetch
  logger: { warn: console.warn, error: console.error },
  stockCache: { ttlMs: 60_000 }, // disabled unless passed
});
```

| Option       | Default            | Notes                                                             |
| ------------ | ------------------ | ----------------------------------------------------------------- |
| `timeoutMs`  | `10000`            | Per attempt. Must be a finite number `> 0`.                       |
| `headers`    | `{}`               | Merged into every request; your values win over the SDK defaults. |
| `retry`      | see below          | Partial overrides of the retry configuration.                     |
| `fetch`      | `globalThis.fetch` | Any `fetch`-compatible function (great for tests).                |
| `logger`     | no-op              | `{ debug?, info?, warn?, error? }`, all optional.                 |
| `stockCache` | `false` (disabled) | `false` or `{ ttlMs?: number }`.                                  |

Retry defaults: `maxRetries: 3`, `initialDelayMs: 300`, `maxDelayMs: 5000`,
`backoffFactor: 2`, `jitter: true`.

Invalid configuration throws `TakasumiBotKitConfigError` immediately — for
example a negative `timeoutMs`, a non-integer `maxRetries`,
`initialDelayMs > maxDelayMs`, or `stockCache.ttlMs <= 0`.

### `baseUrl`

`basicConfig` has **no** `baseUrl` option, and `kit.baseUrl` is read-only:

```ts
kit.baseUrl; // "https://api.takasumibot.com"
kit.baseUrl = "https://example.test"; // TypeError (in strict mode)
```

Resolution order:

1. `process.env.TAKASUMIBOT_BASE_URL` (Node/Bun only, ignored when blank)
2. `servers[0].url` of the OpenAPI document (`https://api.takasumibot.com/`)

Trailing slashes are removed from both the base URL and the path, so requests
go to `https://api.takasumibot.com/v3/tax` (not `.../v3/tax/`).

## Endpoints

| Method                       | Path                            | Returns                     |
| ---------------------------- | ------------------------------- | --------------------------- |
| `getGiftInfo(id)`            | `/v3/gift/{id}`                 | `GiftResponse`              |
| `getTaxInfo()`               | `/v3/tax/`                      | `TaxResponse`               |
| `getShardInfo()`             | `/v3/shard/`                    | `ShardResponse`             |
| `getStatisticsInfo()`        | `/v3/statistics/`               | `StatisticsResponse`        |
| `getHistoryById(id)`         | `/v3/history/{id}`              | `HistoryEntry[]`            |
| `getProfileById(id)`         | `/v3/profile/{id}`              | `ProfileResponse`           |
| `getRanking()`               | `/v3/ranking/`                  | `RankingEntry[]`            |
| `getCompanyList()`           | `/v3/companylist/`              | `CompanyListEntry[]`        |
| `getCompanyById(id)`         | `/v3/company/{id}`              | `CompanyDetailResponse`     |
| `getStockList()`             | `/v3/stock/`                    | `StockEntry[]`              |
| `getDiscordUserByName(name)` | `/v3/discord/usersearch/{name}` | `DiscordUserSearchResponse` |
| `getCompanyHistoryById(id)`  | `/v3/companyHistory/{id}`       | `CompanyHistoryEntry[]`     |
| `getStatus()`                | `/v3/status/`                   | `StatusEntry[]`             |

```ts
// Gift codes are validated client side with /^[A-Za-z0-9]{10}$/ before any request.
const gift = await kit.getGiftInfo("Abc123Xyz0");
```

`/v3/realtime/` is a WebSocket endpoint and is out of scope for this package.

## Stock

The OpenAPI document only exposes the stock **list** (`GET /v3/stock/`), so
`info` / `price` / `history` are derived client side and issue **no additional
HTTP request**.

`prices` is ascending in time (its last element is the newest price), so every
history returned by this SDK is **newest first**.

```ts
const stocks = await kit.getStockList();

// Builder (lazy: nothing happens until you await a terminal method)
const price = await kit.getStock().id("JTTI").price(); // bigint | null
const info = await kit.getStock().id("JTTI").info(); // StockEntry
const history = await kit.getStock().id("JTTI").history({ limit: 3 }); // [103n, 102n, 101n]

// Equivalent individual functions
await kit.getStockPriceById("JTTI");
await kit.getStockInfoById("JTTI");
await kit.getStockHistoryById("JTTI", { limit: 3 });
```

Rules:

- `price()` returns the newest price, or `null` when `prices` is empty (not an
  error).
- `history({ limit })`: `0` → `[]`, negative / `NaN` / non-integer →
  `TakasumiBotKitValidationError`, omitted → the whole history, newest first.
- An unknown stock id throws `TakasumiBotKitValidationError` with
  `code: "STOCK_NOT_FOUND"` (never retried).

### Stock cache

The cache is **disabled by default**: `getStockList()` performs a request every
time. Enable it per client:

```ts
const kit = createKitClient({ stockCache: {} }); // enabled, TTL 60 s
const other = createKitClient({ stockCache: { ttlMs: 30_000 } }); // enabled, TTL 30 s
const uncached = createKitClient({ stockCache: false }); // disabled (default)
```

- Scope: one client instance (two clients never share a cache).
- Applies to `getStockList()` and therefore to every Stock helper.
- `ttlMs` must be a finite number greater than `0`, otherwise
  `TakasumiBotKitConfigError` is thrown.
- Concurrent misses share a single in-flight request (single-flight).

## Errors

All errors extend `TakasumiBotKitError` (which extends `Error`), keep the
original `cause`, and expose `retryable` when meaningful.

| Class                              | Raised when                                                    | `retryable`                    |
| ---------------------------------- | -------------------------------------------------------------- | ------------------------------ |
| `TakasumiBotKitError`              | base class                                                     | `undefined`                    |
| `TakasumiBotKitConfigError`        | invalid `createKitClient` configuration                        | `false`                        |
| `TakasumiBotKitValidationError`    | bad argument, bad `limit`, unknown stock id, bad gift id       | `false`                        |
| `TakasumiBotKitHttpError`          | non 2xx response (`status`, `code?`, `requestId?`, `rawBody?`) | `true` for 429/500/502/503/504 |
| `TakasumiBotKitNetworkError`       | `fetch` rejected                                               | `true`                         |
| `TakasumiBotKitTimeoutError`       | request exceeded `timeoutMs`                                   | `true`                         |
| `TakasumiBotKitRetryLimitError`    | retries exhausted (`attempts`, `lastError`)                    | `false`                        |
| `TakasumiBotKitResponseParseError` | 2xx body is invalid JSON or fails validation (`zodIssues`)     | `false`                        |

```ts
import {
  TakasumiBotKitError,
  TakasumiBotKitHttpError,
  TakasumiBotKitValidationError,
} from "takasumibot-kit";

try {
  await kit.getGiftInfo("nope");
} catch (error) {
  if (error instanceof TakasumiBotKitValidationError) {
    console.error(error.field, error.code); // "id" "INVALID_GIFT_ID"
  } else if (error instanceof TakasumiBotKitHttpError) {
    console.error(error.status, error.requestId);
  } else if (error instanceof TakasumiBotKitError) {
    console.error(error.name, error.message, error.retryable);
  }
}
```

A non 2xx response whose body is not JSON stays an `TakasumiBotKitHttpError`
(and keeps `rawBody`); only **2xx** responses can raise
`TakasumiBotKitResponseParseError`.

## Retries

Retried: network errors, timeouts, and HTTP `429`, `500`, `502`, `503`, `504`.
Everything else fails fast (other 4xx, validation, configuration and parse
errors).

```ts
const kit = createKitClient({ retry: { maxRetries: 0 } }); // disable retries
```

- Delay: `min(initialDelayMs * backoffFactor ** attempt, maxDelayMs)`, then
  jittered into `[50%, 100%]` when `jitter` is `true`.
- A parsable `Retry-After` header wins over the backoff, clipped to
  `maxDelayMs * 3`.
- Each attempt gets its own `timeoutMs`; there is no global deadline.
- With `maxRetries: 0` the original error is rethrown untouched. Otherwise, once
  the retries are exhausted a `TakasumiBotKitRetryLimitError` carrying
  `lastError` is thrown.
- Retries are logged through `logger.warn`, giving up through `logger.error`.

## bigint and JSON

Every `format: int64` field (`amount`, `assets`, `prices`, `dividendAmount`,
`idleTax`, ...) is exposed as **`bigint`**. To make that possible the SDK never
uses `response.json()`:

1. the body is read with `response.text()`;
2. it is parsed by a small custom JSON scanner that returns `bigint` for integer
   literals outside the safe integer range (small integers, floats, strings,
   booleans and `null` behave exactly like `JSON.parse`);
3. the result is validated with `zod`, whose schemas coerce `int64` values to
   `bigint` and `int32` values to `number`;
4. a validation failure raises `TakasumiBotKitResponseParseError`.

```ts
const profile = await kit.getProfileById("123456789012345678");
profile.assets; // 9007199254740993n — never 9007199254740992
```

## Helpers

Pure, side-effect free functions. They are available as named exports and as
`kit.helpers`.

```ts
import {
  truncate,
  pickFields,
  omitFields,
  toMarkdownTable,
  formatNumber,
  formatTimestamp,
  paginate,
  getRecentStockHistory,
} from "takasumibot-kit";

truncate("hello world", 5); // "he..." (the ellipsis counts towards maxLength)
pickFields({ a: 1, b: 2, c: 3 }, ["a", "c"]); // { a: 1, c: 3 }
omitFields({ a: 1, b: 2, c: 3 }, ["b"]); // { a: 1, c: 3 }

toMarkdownTable([
  { name: "JTTI", price: 103n },
  { name: "KENTAI", price: null },
]);
// | name | price |
// | --- | --- |
// | JTTI | 103 |
// | KENTAI |  |

formatNumber(1234567n); // "1,234,567" (ja-JP by default)
formatTimestamp("2024-01-01T00:00:00Z"); // "2024-01-01T00:00:00.000Z"
formatTimestamp(Date.now(), { format: "relative" }); // "今" / "5 分前" (ja-JP)

paginate([1, 2, 3, 4, 5], 1, 2);
// { items: [1, 2], page: 1, pageSize: 2, totalItems: 5, totalPages: 3, hasNext: true, hasPrev: false }
paginate([1, 2, 3], 10, 2).items; // [] — out of range pages are empty, not errors

getRecentStockHistory([100n, 101n, 102n, 103n], 2); // [103n, 102n] (same rules as history())
```

`|` is escaped as `\|`, line breaks become `<br>`, and `null` / `undefined`
become empty cells. Invalid arguments raise
`TakasumiBotKitValidationError`.

## Testing your own code

Every request goes through `basicConfig.fetch`, so no network access is needed:

```ts
import { createKitClient } from "takasumibot-kit";
import { describe, expect, it } from "vitest";

const kit = createKitClient({
  fetch: async () => new Response(JSON.stringify([]), { status: 200 }),
  retry: { maxRetries: 0 },
});

it("returns an empty ranking", async () => {
  await expect(kit.getRanking()).resolves.toEqual([]);
});
```

## Scripts

```bash
npm run build          # tsup: ESM + CJS + .d.ts
npm test               # vitest (no network)
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
npm run generate:types # openapi-typescript -> src/generated/openapi.ts
```

## License

[MIT](./LICENSE) — `Copyright (c) 2026 <Your Name>`.
