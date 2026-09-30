# 公開関数一覧 (API_FUNCTIONS)

OpenAPI `TakasumiBOT-OpenAPI-Document.json` を唯一の正として、HTTP エンドポイントと SDK 関数の対応を定義する。OpenAPI に存在しない path は含めない。

## 共通仕様

- 全関数は `async` で `Promise` を返す
- 引数バリデーション失敗時は `TakasumiBotKitValidationError`
- HTTP エラー時は `TakasumiBotKitHttpError`
- ネットワーク/タイムアウトはそれぞれ `TakasumiBotKitNetworkError` / `TakasumiBotKitTimeoutError`
- レスポンス zod 検証失敗時は `TakasumiBotKitResponseParseError`
- リトライ上限超過時は `TakasumiBotKitRetryLimitError`
- パス末尾スラッシュはリクエスト時に除去 (`/v3/tax/` → `/v3/tax`)
- baseUrl 解決は SPEC.md 参照
- `headers`, `timeoutMs`, `fetch`, `logger`, `retry` は `createKitClient` の basicConfig で共通管理

## 関数一覧表

| # | OpenAPI Path | Method | 関数名 | 引数 | 戻り値型 | 対応 Schema |
|---|--------------|--------|--------|------|----------|-------------|
| 1 | `/v3/gift/{id}` | GET | `getGiftInfo(id: string)` | `id: string` (10文字 A-Za-z0-9) | `Promise<GiftResponse>` | `GiftResponse` |
| 2 | `/v3/tax/` | GET | `getTaxInfo()` | なし | `Promise<TaxResponse>` | `TaxResponse` |
| 3 | `/v3/shard/` | GET | `getShardInfo()` | なし | `Promise<ShardResponse>` | `ShardResponse` |
| 4 | `/v3/statistics/` | GET | `getStatisticsInfo()` | なし | `Promise<StatisticsResponse>` | `StatisticsResponse` |
| 5 | `/v3/history/{id}` | GET | `getHistoryById(id: string)` | `id: string` (Discord userId) | `Promise<HistoryEntry[]>` | `HistoryEntry[]` |
| 6 | `/v3/profile/{id}` | GET | `getProfileById(id: string)` | `id: string` (Discord userId) | `Promise<ProfileResponse>` | `ProfileResponse` |
| 7 | `/v3/ranking/` | GET | `getRanking()` | なし | `Promise<RankingEntry[]>` | `RankingEntry[]` |
| 8 | `/v3/companylist/` | GET | `getCompanyList()` | なし | `Promise<CompanyListEntry[]>` | `CompanyListEntry[]` |
| 9 | `/v3/company/{id}` | GET | `getCompanyById(id: string)` | `id: string` (companyId 10文字 or ownerId) | `Promise<CompanyDetailResponse>` | `CompanyDetailResponse` |
| 10 | `/v3/stock/` | GET | `getStockList()` | なし | `Promise<StockEntry[]>` | `StockEntry[]` |
| 11 | `/v3/discord/usersearch/{name}` | GET | `getDiscordUserByName(name: string)` | `name: string` (Discord username) | `Promise<DiscordUserSearchResponse>` | `DiscordUserSearchResponse` |
| 12 | `/v3/companyHistory/{id}` | GET | `getCompanyHistoryById(id: string)` | `id: string` (companyId) | `Promise<CompanyHistoryEntry[]>` | `CompanyHistoryEntry[]` |
| 13 | `/v3/status/` | GET | `getStatus()` | なし | `Promise<StatusEntry[]>` | `StatusEntry[]` |

※ `/v3/realtime/` は WebSocket のため対象外。実装しない。

## Stock 導出関数 (HTTP 新規リクエストなし)

| # | 元となる HTTP | 関数名 | 引数 | 戻り値型 | 備考 |
|---|---------------|--------|------|----------|------|
| 14 | `GET /v3/stock/` (一覧取得を内部利用) | `getStockInfoById(id: string)` | `id: string` (StockEntry.id enum) | `Promise<StockEntry>` | 一覧から id 検索、TTL60秒キャッシュ |
| 15 | 同上 | `getStockPriceById(id: string)` | `id: string` | `Promise<bigint | null>` | 最新価格を返す (末尾が最新確定)、空配列なら null (q3解決) |
| 16 | 同上 | `getStockHistoryById(id: string, options?: { limit?: number })` | `id, options.limit` | `Promise<bigint[]>` | 新しい順ソート、limit 規則適用、bigint対応 |
| 17 | 同上 | `getStock().id(id).info()` | `id` はビルダーで指定 | `Promise<StockEntry>` | 14 と同等、ビルダー経由 |
| 18 | 同上 | `getStock().id(id).price()` | 同上 | `Promise<bigint | null>` | 15 と同等 |
| 19 | 同上 | `getStock().id(id).history(options?)` | `options.limit?` | `Promise<bigint[]>` | 16 と同等 |

詳細は `STOCK.md` 参照。

## 個別仕様

### 1. getGiftInfo

- 擬似シグネチャ:
  ```ts
  function getGiftInfo(id: string): Promise<GiftResponse>;
  ```
- 引数:
  - `id`: string, 必須, 10文字, 正規表現 `/^[A-Za-z0-9]{10}$/` を満たすべき。満たさない場合は `TakasumiBotKitValidationError`
- 戻り値: `GiftResponse` (type, id, userId, status, receiverId, amount, boughtAt, createdAt)
- エラー:
  - ValidationError: id 形式不正
  - HttpError: 404 等
  - その他共通エラー
- JSDoc 必須: 概要、@param id、@returns、@throws、@example

### 2. getTaxInfo

- ```ts
  function getTaxInfo(): Promise<TaxResponse>;
  ```
- 引数なし
- 戻り値: `TaxResponse` (benefitTax[], companyBenefitTax[], 各種 tax rate)
- エラー: HttpError, Network, Timeout, Parse, RetryLimit

### 3. getShardInfo

- ```ts
  function getShardInfo(): Promise<ShardResponse>;
  ```
- 戻り値: `ShardResponse` { data: ShardDataEntry[], loggedAt }

### 4. getStatisticsInfo

- ```ts
  function getStatisticsInfo(): Promise<StatisticsResponse>;
  ```
- 戻り値: StatisticsResponse (user, company, economy, event)

### 5. getHistoryById

- ```ts
  function getHistoryById(id: string): Promise<HistoryEntry[]>;
  ```
- 引数: `id` string (Discord userId), 非空必須
- 戻り値: HistoryEntry[] (id, userId, amount, reason, tradedAt)

### 6. getProfileById

- ```ts
  function getProfileById(id: string): Promise<ProfileResponse>;
  ```
- 引数: `id` string (Discord userId)
- 戻り値: ProfileResponse (assets, chips, jobType)

### 7. getRanking

- ```ts
  function getRanking(): Promise<RankingEntry[]>;
  ```
- 戻り値: RankingEntry[] 最大50件想定だが、API 仕様上は配列長不定として扱う

### 8. getCompanyList

- ```ts
  function getCompanyList(): Promise<CompanyListEntry[]>;
  ```
- 戻り値: CompanyListEntry[]

### 9. getCompanyById

- ```ts
  function getCompanyById(id: string): Promise<CompanyDetailResponse>;
  ```
- 引数: `id` string (companyId 10文字 or ownerId)
- 戻り値: CompanyDetailResponse (CompanyListEntry + statistics + employees[])

### 10. getStockList

- ```ts
  function getStockList(): Promise<StockEntry[]>;
  ```
- 戻り値: StockEntry[] (name, id enum, description, dividendAmount, dividendRate, prices: number[])

### 11. getDiscordUserByName

- ```ts
  function getDiscordUserByName(name: string): Promise<DiscordUserSearchResponse>;
  ```
- 引数: `name` string (Discord username), 非空, trim して空なら ValidationError
- 戻り値: DiscordUserSearchResponse

### 12. getCompanyHistoryById

- ```ts
  function getCompanyHistoryById(id: string): Promise<CompanyHistoryEntry[]>;
  ```
- 引数: `id` string (companyId)
- 戻り値: CompanyHistoryEntry[]

### 13. getStatus

- ```ts
  function getStatus(): Promise<StatusEntry[]>;
  ```
- 戻り値: StatusEntry[] (id, ping, totalUser, totalGuild, totalCommand, cpuUsage, memoryUsage, loggedAt)

## 型生成方針 (q7,q16解決)

- `openapi-typescript` で生成された型を `components.schemas` から import
- 例:
  ```ts
  import type { components } from './generated/api';
  type GiftResponse = components['schemas']['GiftResponse'];
  ```
- 配列型は `components['schemas']['HistoryEntry'][]` のように表現
- int64 は bigint対応 (q7): 公開型では `number` → `bigint` に変換。例: `GiftResponse.amount: bigint`, `StockEntry.prices: bigint[]`, `ProfileResponse.assets: bigint` 等
- 公開型は上記を re-export し、必要に応じて branded type (例: `DiscordUserId`) を付与する案もあるが、現行では string のまま
- Gift ID は `/^[A-Za-z0-9]{10}$/` で厳密バリデーション (q16確定)

## リクエスト実装の共通流れ

1. 引数バリデーション (空文字、形式)
2. URL 構築: `baseUrl` (readonly, env > default) + path (末尾スラッシュ除去) + path param encodeURIComponent
3. headers マージ: default + config.headers
4. fetch 呼び出し: `fetch(url, { method, headers, signal: AbortSignal.timeout(timeoutMs) })`
5. タイムアウト時: `TakasumiBotKitTimeoutError`
6. ネットワークエラー時: `TakasumiBotKitNetworkError`
7. レスポンス受信:
   - status が 2xx 以外 → `TakasumiBotKitHttpError` (ただしリトライ対象は RETRY.md に従いリトライ)
   - 2xx → JSON パース試行、失敗で `TakasumiBotKitResponseParseError`
   - zod 検証、失敗で `TakasumiBotKitResponseParseError`
8. 成功時は検証済みデータを return
9. リトライロジックは上記全体をラップ (RETRY.md)

## JSDoc 要件 (public API)

全公開関数に以下を含む JSDoc を付与する前提:

- 概要 (1-2文)
- @param (各引数の説明)
- @returns (戻り値の説明)
- @throws (起こりうるエラー種別)
- @example (使用例コード)

例:

```ts
/**
 * 指定したギフトIDの情報を取得します。
 * @param id - ギフトコード (A-Za-z0-9 10文字)
 * @returns ギフト情報
 * @throws {TakasumiBotKitValidationError} id 形式が不正な場合
 * @throws {TakasumiBotKitHttpError} HTTP エラー時
 * @example
 * const gift = await kit.getGiftInfo('Abc123Xyz0');
 */
```

## 受け入れ基準

- 本ファイルに記載の path が全て OpenAPI に存在すること
- OpenAPI に存在する HTTP path (WS 除く) が全て本ファイルに網羅されていること
- 必須マッピング表 (課題文の表) と一致すること
- Stock 導出関数が新規 HTTP リクエストを行わない旨が明記されていること
