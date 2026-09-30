# takasumibot-toolkit 仕様書 (SPEC)

## 1. パッケージ概要・目標

- パッケージ名: `takasumibot-toolkit`
- 目的: `TakasumiBOT-OpenAPI-Document.json` (v3.0.0-beta) を唯一の正とする、TakasumiBOT 公開 API の TypeScript クライアント SDK。
- 目標:
  - 型安全 (TypeScript strict, `any` 原則禁止)
  - Node.js 20+ / Bun v1.4+ で動作、global `fetch` を使用
  - 認証不要 (apiKey 等なし)
  - レスポンスを `zod` で検証し、失敗時は専用エラーに変換
  - リトライ、タイムアウト、ログ、ヘルパーを備えたプロダクション用途
  - ESM + CJS + dts を `tsup` で配布
  - MIT ライセンス
- 非目標:
  - WebSocket `/v3/realtime/` のクライアント実装は対象外とする (仕様上存在を明記するのみ)

## 2. 技術スタックと依存方針

- 言語: TypeScript (strict)
- ランタイム: Node.js 20+, Bun v1.4+
- HTTP: global `fetch` (Node 20 の built-in, Bun の built-in)
- 依存:
  - runtime: 原則なし。例外として `zod` のみ許可 (レスポンス検証)
  - dev: `openapi-typescript` (OpenAPI → TypeScript 型生成), `tsup` (ESM+CJS+dts), `vitest`, `eslint`, `prettier`, `@types/node` 等
- Lint/Format: ESLint + Prettier
- 型生成: `openapi-typescript` で `components.schemas` を元に型を生成し、`src/generated/` 等に配置する想定。生成された型は直接公開せず、SDK の公開型としてラップする。
- `any` 原則禁止: `unknown` またはジェネリクスで代替。やむなく使う場合は `eslint-disable` コメントと理由を併記する方針を SPEC に明記する。

## 3. baseUrl 解決ルール

- OpenAPI `servers[0].url` は `https://api.takasumibot.com/` (末尾スラッシュあり)。これを既定 baseUrl の正とする。
- `basicConfig` に `baseUrl` を含めない。クライアント生成時に baseUrl を直接渡す API は提供しない。
- 解決優先順位:
  1. 環境変数 `TAKASUMIBOT_BASE_URL` が存在し、非空文字の場合、それを採用
  2. それ以外は `servers[0].url` を採用
- 環境変数読み取り:
  - `process.env.TAKASUMIBOT_BASE_URL` が存在すれば参照 (Node/Bun 共通)
  - `process` が未定義の環境では既定値を使用 (ブラウザ互換性考慮、ただし Node/Bun が主対象)
  - 取得した baseUrl は末尾スラッシュを除去して正規化し、クライアント内部に保持
- baseUrl はクライアントから読み取り専用で参照可能:
  - `kit.baseUrl` または `kit.getBaseUrl()` のような readonly getter を提供 (変更不可)
  - 型: `string`, readonly
- パス結合時のスラッシュ規則:
  - リクエスト時、パスの末尾スラッシュは除去する (確定方針)
  - 実装仕様: `baseUrl` の末尾スラッシュ除去 + `path` の末尾スラッシュ除去、ただし path の先頭スラッシュは保持
  - 例: baseUrl=`https://api.takasumibot.com/` + path=`/v3/tax/` → `https://api.takasumibot.com/v3/tax`
  - クエリパラメータは現行 OpenAPI では存在しないが、将来拡張で付与する場合は `?` 以降は除去対象外

## 4. createKitClient / basicConfig の型イメージと既定値

### 4.1 ファクトリ

擬似シグネチャ (実装コードではない):

```ts
type KitClientConfig = {
  timeoutMs?: number;
  headers?: Record<string, string>;
  retry?: Partial<RetryConfig>;
  fetch?: typeof globalThis.fetch;
  logger?: Logger;
};

type KitClient = {
  readonly baseUrl: string;
  // HTTP エンドポイント関数
  getGiftInfo(id: string): Promise<GiftResponse>;
  getTaxInfo(): Promise<TaxResponse>;
  getShardInfo(): Promise<ShardResponse>;
  getStatisticsInfo(): Promise<StatisticsResponse>;
  getHistoryById(id: string): Promise<HistoryEntry[]>;
  getProfileById(id: string): Promise<ProfileResponse>;
  getRanking(): Promise<RankingEntry[]>;
  getCompanyList(): Promise<CompanyListEntry[]>;
  getCompanyById(id: string): Promise<CompanyDetailResponse>;
  getStockList(): Promise<StockEntry[]>;
  getDiscordUserByName(name: string): Promise<DiscordUserSearchResponse>;
  getCompanyHistoryById(id: string): Promise<CompanyHistoryEntry[]>;
  getStatus(): Promise<StatusEntry[]>;
  // Stock 導出 (解決済み: q1,q2,q3,q13)
  getStock(): StockBuilder;
  getStockInfoById(id: string): Promise<StockEntry>;
  getStockPriceById(id: string): Promise<number | null>; // 空配列時は null を返す (q3解決)
  getStockHistoryById(id: string, options?: { limit?: number }): Promise<number[]>;
};

function createKitClient(config?: KitClientConfig): KitClient;
```

### 4.2 basicConfig フィールド

- `timeoutMs?: number` — 各リクエストのタイムアウト (ms)。AbortController で実装。
- `headers?: Record<string, string>` — 全リクエストに付与する追加ヘッダ。`Content-Type: application/json` 等は内部で設定、ユーザー指定があればマージ (ユーザー指定優先かは SPEC で定義: ユーザー指定を優先)
- `retry?: Partial<RetryConfig>` — リトライ設定の部分的オーバーライド
  ```ts
  type RetryConfig = {
    maxRetries: number; // 0 = リトライなし
    initialDelayMs: number;
    maxDelayMs: number;
    backoffFactor: number;
    jitter: boolean;
  };
  ```
- `fetch?: typeof globalThis.fetch` — fetch 実装の差し替え (テスト用モック、またはカスタム fetch)
- `logger?: Logger`
  ```ts
  type Logger = {
    debug?: (message: string, meta?: unknown) => void;
    info?: (message: string, meta?: unknown) => void;
    warn?: (message: string, meta?: unknown) => void;
    error?: (message: string, meta?: unknown) => void;
  };
  ```
  - 全フィールド optional。未指定なら no-op logger を使用。

### 4.3 既定値

- `timeoutMs`: 10000
- `retry.maxRetries`: 3
- `retry.initialDelayMs`: 300
- `retry.maxDelayMs`: 5000
- `retry.backoffFactor`: 2
- `retry.jitter`: true
- `headers`: {}
- `fetch`: globalThis.fetch
- `logger`: no-op
- `baseUrl`: 上記解決ルール参照

### 4.4 バリデーション

- `timeoutMs` が 0 以下、NaN、非数値 → `TakasumiBotKitConfigError`
- `retry.maxRetries` が負、NaN、非整数 → `TakasumiBotKitConfigError`
- `retry.initialDelayMs` / `maxDelayMs` が負、NaN → `TakasumiBotKitConfigError`。0は即時リトライとして許可
- `initialDelayMs > maxDelayMs` の場合 → `TakasumiBotKitConfigError` (解決済み: q6)
- `headers` がオブジェクトでない → `TakasumiBotKitConfigError`
- `fetch` が関数でない → `TakasumiBotKitConfigError`

## 5. 全 HTTP エンドポイントと関数の対応

OpenAPI `paths` に存在する HTTP エンドポイントのみを対象とする。存在しないパスは発明しない。

| OpenAPI Path | Method | 関数名 | 備考 |
|--------------|--------|--------|------|
| `/v3/gift/{id}` | GET | `getGiftInfo(id: string)` | id は 10 文字 A-Za-z0-9 |
| `/v3/tax/` | GET | `getTaxInfo()` | |
| `/v3/shard/` | GET | `getShardInfo()` | |
| `/v3/statistics/` | GET | `getStatisticsInfo()` | |
| `/v3/history/{id}` | GET | `getHistoryById(id: string)` | Discord userId |
| `/v3/profile/{id}` | GET | `getProfileById(id: string)` | |
| `/v3/ranking/` | GET | `getRanking()` | 上位50 |
| `/v3/companylist/` | GET | `getCompanyList()` | |
| `/v3/company/{id}` | GET | `getCompanyById(id: string)` | companyId または ownerId |
| `/v3/stock/` | GET | `getStockList()` | 一覧 |
| `/v3/discord/usersearch/{name}` | GET | `getDiscordUserByName(name: string)` | |
| `/v3/companyHistory/{id}` | GET | `getCompanyHistoryById(id: string)` | |
| `/v3/status/` | GET | `getStatus()` | |
| `/v3/realtime/` | WS | 対象外 | 実装しない、SPEC に明記のみ |

詳細な引数・戻り値型は `docs/API_FUNCTIONS.md` を参照。

### パス末尾スラッシュ除去

- 全リクエストで path の末尾スラッシュを除去する。
- 例: `/v3/tax/` → `/v3/tax`
- OpenAPI 上はスラッシュ付きで定義されているが、リクエスト時は除去した形で送る。
- baseUrl との結合時にも重複スラッシュを防ぐ。

## 6. Stock クライアント側導出の説明

OpenAPI には `/v3/stock/{id}` や price/history 用の個別 HTTP エンドポイントは存在しない。唯一存在するのは `GET /v3/stock/` の一覧取得のみ。

よって Stock 関連の個別取得はクライアント側で導出する (新規 HTTP リクエストは行わない):

- `getStockList()` で `StockEntry[]` を取得
- クライアント側で `id` 検索
- 詳細は `docs/STOCK.md` を参照

重要な設計判断 (解決済み):

- `StockEntry.prices: number[]` の並び順は「配列末尾が最新」(昇順) と確定 (q1: asc)。戻り値は新しい順 (降順, newest-first) にソートして返すため `prices.slice(-n).reverse()` を行う。例: `[100,101,102]` → 102が最新、history全件は `[102,101,100]`。
- `id` が見つからない場合は `TakasumiBotKitValidationError` with `code: 'STOCK_NOT_FOUND'` と確定 (q2: validation)。リトライ対象外。
- `prices` が空配列の場合の `getStockPriceById` は `null` を返すと確定 (q3: return_null)。型は `Promise<number | null>` に変更。
- `getStock().id(id)` ビルダーは `getStockList()` を内部で呼び出すが、TTL 60秒キャッシュを導入 (q13: ttl_60)。オプションで有効化し、既定でキャッシュあり、連続呼び出しでHTTPリクエストを削減。
- Gift ID は厳密な正規表現 `/^[A-Za-z0-9]{10}$/` でバリデーション (q16: strict_regex)。

## 7. エラー方針 (ERRORS.md への参照)

- 基底: `TakasumiBotKitError` extends Error
- 派生:
  - `TakasumiBotKitConfigError` — クライアント設定不正
  - `TakasumiBotKitValidationError` — 引数バリデーション失敗、Stock limit 規則違反、id 不正など
  - `TakasumiBotKitHttpError` — HTTP ステータスエラー (4xx/5xx)。status, code, requestId, body, headers 等を保持
  - `TakasumiBotKitNetworkError` — fetch が throw (ネットワーク到達不能)
  - `TakasumiBotKitTimeoutError` — AbortController によるタイムアウト
  - `TakasumiBotKitRetryLimitError` — リトライ上限超過。最後のエラーを cause に保持
  - `TakasumiBotKitResponseParseError` — JSON パース失敗、または zod 検証失敗
- 共通フィールド: `name`, `message`, `cause`, `retryable?: boolean`
- `retryable` 判定は RETRY.md の対象条件と連動
- 詳細は `docs/ERRORS.md` 参照

## 8. リトライ方針 (RETRY.md への参照)

- 対象:
  - ネットワークエラー (`TakasumiBotKitNetworkError`)
  - タイムアウト (`TakasumiBotKitTimeoutError`)
  - HTTP 429, 500, 502, 503, 504
- 非対象:
  - 上記以外の 4xx (400,401,403,404 等)
  - バリデーションエラー (`TakasumiBotKitValidationError`, `TakasumiBotKitConfigError`)
  - パースエラー (`TakasumiBotKitResponseParseError`) — 基本的にリトライしない (ただし 5xx 時の body パース失敗は HTTP エラーとして扱う)
- 方式:
  - 指数バックオフ: `delay = min(initialDelayMs * backoffFactor^attempt, maxDelayMs)`
  - jitter: true なら `delay * (0.5 + random()*0.5)` = 50%〜100% の jitter (確定)
  - `Retry-After` ヘッダがあれば優先: 秒数 または HTTP-date をパース。`maxDelayMs*3` を超える場合は `maxDelayMs*3` にクリップ (q5: clip_3x 解決)
  - 上限超過時: `TakasumiBotKitRetryLimitError` を throw
  - リトライ中は `logger.warn` で試行回数、待機時間、原因を出力
- 詳細は `docs/RETRY.md` 参照

## 9. zod 検証方針

- `openapi-typescript` で生成した型を元に、対応する `zod` スキーマを手書きまたは生成補助で定義する。
- 全 HTTP レスポンスは `zod` で検証する。検証失敗時は `TakasumiBotKitResponseParseError` を throw。
- 方針 (解決済み):
  - `components.schemas` の各スキーマに対応する zod スキーマを作成 (`src/schemas/` 配下想定)
  - `required` フィールドは zod でも required、`nullable` は `.nullable()`、optional は `.optional()`
  - 未知フィールドは `.passthrough()` で保持 (q8: passthrough 確定)。API追加フィールドで壊れないようにする
  - `format: date-time` は `z.string().datetime()` または `z.string().refine(Date.parse)` で検証
  - `int64` は `bigint` 対応 (q7: bigint 解決)。`z.bigint()` または `z.string().transform(BigInt)` 等で安全に扱う。公開型は `bigint` または `number | bigint` の union を検討。暫定で `bigint` を採用し、既存 number との互換は `toString()` で担保
  - 配列レスポンスは `z.array(Schema)` で検証
  - パースエラー時は zod の issues を `cause` に含め、ログに出力
  - 5xx時のパース失敗は `HttpError` 優先 (q17: http_priority 解決)。2xx時のみ `ParseError`
- 型生成と zod の二重管理を避けるため、`zod` から型を推論する (`z.infer<>`) か、openapi-typescript 型と zod 型の整合性をテストで担保する。

## 10. ヘルパー方針 (HELPERS.md への参照)

ヘルパーは純粋関数、副作用なし、外部依存なしを原則とする。

最低限提供 (解決済み):

- `truncate(text, maxLength)` — ellipsisはmaxLengthに含める (q11: include)
- `pickFields(object, keys)`
- `omitFields(object, keys)`
- `toMarkdownTable(rows)` — `|`→`\|`, 改行→`<br>` (q12: pipe_escape_br)
- `formatNumber(value, options?)` — 既定locale `ja-JP` (q9: ja-JP)
- `formatTimestamp(value, options?)` — 既定locale `ja-JP`
- `paginate(items, page, pageSize)` — pageは1-based、totalPages超えは空配列 (q10: empty)
- `getRecentStockHistory(history, limit)` — Stock historyのlimit規則と同じ

詳細入出力仕様は `docs/HELPERS.md` 参照。

公開 API としては `kit.helpers` または named export での提供を検討。public として JSDoc 必須。

## 11. プロジェクト構成 (PROJECT_STRUCTURE.md への参照)

想定構成は `docs/PROJECT_STRUCTURE.md` 参照。概要:

- `src/client/` — createKitClient 実装
- `src/api/` — 各エンドポイント関数
- `src/stock/` — Stock ビルダー・個別関数
- `src/errors/` — エラークラス階層
- `src/retry/` — リトライロジック
- `src/helpers/` — ヘルパー
- `src/schemas/` — zod スキーマ
- `src/generated/` — openapi-typescript 生成物
- `src/index.ts` — public export
- `docs/` — 本設計ドキュメント群
- `package.json`, `tsconfig.json`, `tsup.config.ts` 等

## 12. テスト方針 (TEST_PLAN.md への参照)

- Vitest によるユニットテスト
- fetch モック方針: `config.fetch` にモックを注入、または `vi.stubGlobal('fetch', ...)`
- zod 検証テスト、エラー分岐、リトライ、Stock 導出、ヘルパーをカバー
- 最低限ケース一覧は `docs/TEST_PLAN.md` 参照

## 13. 受け入れ基準

- [ ] ビルド: `tsup` で ESM + CJS + dts が生成される
- [ ] テスト: Vitest が green
- [ ] lint: ESLint エラーなし
- [ ] 型チェック: `tsc --noEmit` が strict でエラーなし
- [ ] OpenAPI 外 path 禁止: `docs/API_FUNCTIONS.md` に列挙された path が OpenAPI `paths` に全て存在し、逆に OpenAPI にない path を実装していない (WS 除外)
- [ ] baseUrl 読み取り専用: `kit.baseUrl` が readonly で、環境変数 `TAKASUMIBOT_BASE_URL` が優先される
- [ ] WS 非実装: `/v3/realtime/` の WebSocket クライアント実装が含まれていないことをコードレビューまたは SPEC で明記
- [ ] パス末尾スラッシュ除去: リクエスト URL で末尾スラッシュが除去されることをテストで確認
- [ ] エラークラス: 必須 8 クラスが全て基底を継承し、`name`/`cause`/`retryable` を適切に持つ
- [ ] リトライ: 対象/非対象、Backoff、Retry-After、上限超過時の挙動が SPEC 通り
- [ ] Stock: 新規 HTTP リクエストなし、クライアント側導出、limit 規則準拠、新しい順ソート
- [ ] zod 検証: 全レスポンスで検証し、失敗時に `TakasumiBotKitResponseParseError`
- [ ] public API に JSDoc: 概要/@param/@returns/@throws/@example
- [ ] ライセンス: MIT, `Copyright (c) 2026 <Your Name>` プレースホルダー

## 14. 補足: 型イメージ

### 公開型の例

```ts
// openapi-typescript 生成型を元にした公開型のイメージ
type GiftResponse = {
  type: 'gift';
  id: string;
  userId: string;
  status: 'received' | 'unused';
  receiverId: string | null;
  amount: number;
  boughtAt: string | null;
  createdAt: string;
};

// ... 他の schemas も同様
```

### StockBuilder 型イメージ (解決済み)

```ts
type StockBuilder = {
  id(id: string): StockIdBuilder;
};

type StockIdBuilder = {
  info(): Promise<StockEntry>;
  price(): Promise<number | null>; // 空配列時は null (q3解決)
  history(options?: { limit?: number }): Promise<number[]>;
};
```

## 15. 未解決事項の扱い

- 当初17件あった未解決事項は全て解決済み (q1-q17)。`docs/UNRESOLVED.md` は「なし」または解決済み一覧を記載。
- 今後新たに判断できない事項が出た場合は `UNRESOLVED.md` に追記し、勝手に決めない。

## 16. WebSocket 対象外の明記

- OpenAPI path `/v3/realtime/` は WebSocket (`ws` operation) として定義されている。
- 本パッケージでは対象外とし、クライアント実装、型、テスト、ドキュメントを含めない (q15: out_of_scope 解決)。
- 将来的にも本パッケージでは実装せず、必要なら別パッケージで提供する方針。

