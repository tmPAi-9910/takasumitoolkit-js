# プロジェクト構成 (PROJECT_STRUCTURE)

## 想定ディレクトリツリー

```
takasumibot-kit/
├── src/
│   ├── index.ts                 # public entry, createKitClient, re-exports
│   ├── client/
│   │   ├── createKitClient.ts   # ファクトリ実装
│   │   ├── config.ts            # Config 型, 既定値, バリデーション
│   │   ├── baseUrl.ts           # baseUrl 解決ロジック (env > default)
│   │   └── types.ts             # KitClient 型, Logger 型等
│   ├── api/
│   │   ├── fetcher.ts           # 共通 fetch ラッパー (timeout, headers, retry, zod)
│   │   ├── paths.ts             # OpenAPI path テンプレート + プレースホルダ展開
│   │   ├── httpError.ts         # HttpError 生成, code/requestId ベストエフォート抽出
│   │   ├── getGiftInfo.ts
│   │   ├── getTaxInfo.ts
│   │   ├── getShardInfo.ts
│   │   ├── getStatisticsInfo.ts
│   │   ├── getHistoryById.ts
│   │   ├── getProfileById.ts
│   │   ├── getRanking.ts
│   │   ├── getCompanyList.ts
│   │   ├── getCompanyById.ts
│   │   ├── getStockList.ts
│   │   ├── getDiscordUserByName.ts
│   │   ├── getCompanyHistoryById.ts
│   │   ├── getStatus.ts
│   │   └── index.ts             # api 関数 re-export
│   ├── stock/
│   │   ├── cache.ts             # Stock 一覧キャッシュ (既定無効・オプション有効, single-flight)
│   │   ├── builder.ts           # getStock().id(id) ビルダー
│   │   ├── getStockInfoById.ts
│   │   ├── getStockPriceById.ts
│   │   ├── getStockHistoryById.ts
│   │   └── index.ts
│   ├── errors/
│   │   ├── TakasumiBotKitError.ts
│   │   ├── TakasumiBotKitConfigError.ts
│   │   ├── TakasumiBotKitValidationError.ts
│   │   ├── TakasumiBotKitHttpError.ts
│   │   ├── TakasumiBotKitNetworkError.ts
│   │   ├── TakasumiBotKitTimeoutError.ts
│   │   ├── TakasumiBotKitRetryLimitError.ts
│   │   ├── TakasumiBotKitResponseParseError.ts
│   │   └── index.ts
│   ├── retry/
│   │   ├── retryConfig.ts       # RetryConfig 型, 既定値
│   │   ├── isRetryable.ts       # retryable 判定
│   │   ├── backoff.ts           # backoff + jitter + Retry-After
│   │   ├── withRetry.ts         # リトライループ本体
│   │   └── index.ts
│   ├── helpers/
│   │   ├── truncate.ts
│   │   ├── pickFields.ts
│   │   ├── omitFields.ts
│   │   ├── toMarkdownTable.ts
│   │   ├── formatNumber.ts
│   │   ├── formatTimestamp.ts
│   │   ├── paginate.ts
│   │   ├── getRecentStockHistory.ts
│   │   └── index.ts
│   ├── schemas/
│   │   ├── gift.ts              # zod schemas for GiftResponse etc
│   │   ├── tax.ts
│   │   ├── shard.ts
│   │   ├── statistics.ts
│   │   ├── history.ts
│   │   ├── profile.ts
│   │   ├── ranking.ts
│   │   ├── company.ts
│   │   ├── stock.ts
│   │   ├── discord.ts
│   │   ├── companyHistory.ts
│   │   ├── status.ts
│   │   └── index.ts
│   ├── generated/
│   │   ├── openapi.ts           # openapi-typescript 生成物 (コミット対象)
│   │   └── README.md            # 生成方法メモ
│   └── internal/
│       ├── logger.ts            # no-op logger, logger 作成ヘルパー
│       ├── json.ts              # bigint 対応 JSON パーサ (方式 A: text → 独自スキャナ)
│       ├── url.ts               # URL 結合, 末尾スラッシュ除去ユーティリティ
│       ├── validate.ts          # 引数バリデーション (gift id / 非空文字 / history limit)
│       └── sleep.ts             # sleep ユーティリティ
├── docs/
│   ├── SPEC.md
│   ├── API_FUNCTIONS.md
│   ├── ERRORS.md
│   ├── RETRY.md
│   ├── STOCK.md
│   ├── HELPERS.md
│   ├── PROJECT_STRUCTURE.md
│   ├── TEST_PLAN.md
│   ├── UNRESOLVED.md
│   └── (追加 docs)
├── tests/
│   ├── unit/
│   │   ├── client/
│   │   │   ├── createKitClient.test.ts
│   │   │   └── baseUrl.test.ts
│   │   ├── api/
│   │   │   ├── getGiftInfo.test.ts
│   │   │   ├── getTaxInfo.test.ts
│   │   │   └── ...
│   │   ├── stock/
│   │   │   ├── builder.test.ts
│   │   │   ├── getStockInfoById.test.ts
│   │   │   └── ...
│   │   ├── errors/
│   │   │   └── errors.test.ts
│   │   ├── retry/
│   │   │   ├── backoff.test.ts
│   │   │   └── withRetry.test.ts
│   │   └── helpers/
│   │       ├── truncate.test.ts
│   │       └── ...
│   └── __mocks__/
│       └── fetch.ts
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── .eslintrc.cjs
├── .prettierrc
├── LICENSE (MIT, Copyright (c) 2026 <Your Name>)
├── README.md
└── TakasumiBOT-OpenAPI-Document.json
```

## 主要ファイルの役割

### src/index.ts

- public entry point
- `createKitClient` を export
- 全エラー, ヘルパー, 型を re-export
- JSDoc で public API を明示
- `tsup` の entry として指定

### src/client/createKitClient.ts

- ファクトリ関数 `createKitClient(config?)` の実装
- config バリデーション → ConfigError
- baseUrl 解決 (baseUrl.ts 利用)
- fetch, logger, retryConfig, headers, timeoutMs の既定値マージ
- KitClient オブジェクト生成: 各 API 関数をクロージャで束縛 (config を共有)
- `baseUrl` readonly プロパティを公開
- Stock ビルダーもここで束縛

### src/client/config.ts

- `KitClientConfig`, `ResolvedConfig` 型定義
- 既定値定数: `DEFAULT_TIMEOUT_MS = 10000`, `DEFAULT_RETRY_CONFIG` 等
- バリデーション関数: `validateConfig()`

### src/client/baseUrl.ts

- `resolveBaseUrl(): string` — 環境変数 `TAKASUMIBOT_BASE_URL` > `servers[0].url` の優先順位で解決
- `normalizeBaseUrl(url: string): string` — 末尾スラッシュ除去
- `getDefaultBaseUrl(): string` — OpenAPI servers[0].url を定数として保持 (`https://api.takasumibot.com/`)

### src/client/types.ts

- `KitClient`, `Logger`, `KitClientConfig` 等の公開型

### src/api/fetcher.ts

- 共通 fetch ラッパー
- 責務:
  - URL 構築 (baseUrl + path, 末尾スラッシュ除去, path param encode)
  - headers マージ
  - AbortSignal.timeout によるタイムアウト
  - fetch 呼び出し、NetworkError/TimeoutError 変換
  - status チェック、HttpError 生成
  - `response.text()` → 独自 JSON パース (bigint 対応)、ParseError 生成
  - zod 検証、ParseError 生成
  - withRetry でラップ
- 型: `fetcher<T>(path: string, options: { method, schema: ZodSchema<T> }): Promise<T>`

### src/api/*.ts (各エンドポイント)

- 各 API 関数の実装
- 引数バリデーション → ValidationError
- fetcher 呼び出し
- zod スキーマ指定
- JSDoc 付与

### src/stock/ (q1,q2,q3,q13解決)

- Stock 導出ロジック
- `builder.ts`: `getStock().id(id)` ビルダー。内部で `getStockList` を呼び出し、キャッシュ利用 (キャッシュは既定無効)
- `cache.ts`: StockListキャッシュ (data, expiresAt, ttlMs=60000既定)。`stockCache` 指定時のみ有効、single-flight 付き (q13解決)
- 各個別関数は `getStockList` を利用し、検索・加工。price()は `bigint | null` を返す (q3)
- pricesは末尾が最新確定 (q1)、id不存在はValidationError(STOCK_NOT_FOUND)確定 (q2)

### src/errors/

- 各エラークラス定義
- 基底 `TakasumiBotKitError` は `Error` を継承し、`name`, `cause`, `retryable` を持つ
- 各派生クラスは固有フィールドを持つ (ERRORS.md 参照)
- `index.ts` で一括 export

### src/retry/

- `retryConfig.ts`: `RetryConfig` 型と既定値
- `isRetryable.ts`: エラーから retryable 判定
- `backoff.ts`: delay 計算、Retry-After パース (秒数 + HTTP-date)
- `withRetry.ts`: リトライループ、logger 出力、RetryLimitError 生成

### src/helpers/

- 各ヘルパー純粋関数
- バリデーション → ValidationError
- JSDoc 必須

### src/schemas/ (q7,q8,q17解決)

- zod スキーマ定義
- OpenAPI `components.schemas` に対応
- 各ファイルで `z.object({...})` を定義
- `.passthrough()` で未知フィールド保持確定 (q8)
- int64はbigint対応 (q7): `z.bigint()` または `z.number().transform(BigInt)` 等
- 5xx時のパース失敗はHttpError優先 (q17)
- `index.ts` で一括 export

### src/generated/openapi.ts

- `openapi-typescript` で生成された型
- 生成コマンド: `npm run generate:types`
  (= `openapi-typescript TakasumiBOT-OpenAPI-Document.json -o src/generated/openapi.ts`)
- git 管理方針: コミットするか .gitignore するかはプロジェクト方針。本設計ではコミットを推奨 (レビュー容易、CI で再生成確認)

### src/internal/

- 内部ユーティリティ
- `logger.ts`: no-op logger 生成、`createLogger`
- `url.ts`: `joinUrl(baseUrl, path)`, `stripTrailingSlash`
- `sleep.ts`: `sleep(ms: number): Promise<void>`

### tests/

- Vitest によるユニットテスト
- `__mocks__/fetch.ts`: fetch モックヘルパー
- 各 src に対応するテストファイル

### ルート設定ファイル

- `package.json`:
  - name: `takasumibot-kit`
  - type: module? tsup で ESM+CJS 両対応のため、package.json は ESM 推奨
  - scripts: `build` (tsup), `test` (vitest), `lint` (eslint), `format` (prettier), `typecheck` (tsc --noEmit), `generate` (openapi-typescript)
  - dependencies: `zod`
  - devDependencies: `openapi-typescript`, `tsup`, `vitest`, `typescript`, `eslint`, `prettier`, etc
  - exports: ESM + CJS + types
  - engines: node >=20, bun >=1.4
  - license: MIT
- `tsconfig.json`: strict true, noImplicitAny, etc
- `tsup.config.ts`: entry src/index.ts, format ['esm','cjs'], dts true, sourcemap true
- `vitest.config.ts`: environment node, coverage
- `eslint.config.mjs`: ESLint flat config (typescript-eslint + eslint-config-prettier)
- `.prettierrc.json` / `.prettierignore`: 標準設定

## ビルド成果物

- `dist/index.js` (ESM)
- `dist/index.cjs` (CJS)
- `dist/index.d.ts` (型定義)
- `dist/*.map` (sourcemap)

## 公開 API の範囲

- `createKitClient`
- 全 API 関数 (KitClient メソッドとして)
- Stock ビルダー + 個別関数
- 全エラークラス
- 全ヘルパー
- 型: `KitClient`, `KitClientConfig`, `RetryConfig`, `Logger`, 各 Schema 型

## 非公開 (internal)

- `fetcher`, `withRetry`, `backoff`, `isRetryable`, `resolveBaseUrl`, `schemas` 内部実装等は直接 export しない (ただしテスト容易性のため `src/internal` から export する場合は `_internal` 名前空間で公開する案もある)

## 依存関係の方向

```
index.ts
 ├─ client/ (config, baseUrl)
 ├─ api/ (fetcher, schemas, errors, retry)
 ├─ stock/ (api/getStockList, helpers/getRecentStockHistory, errors)
 ├─ errors/
 ├─ retry/
 ├─ helpers/
 └─ schemas/ + generated/
```

- 循環依存禁止
- api/ は errors/, retry/, schemas/, internal/ に依存
- stock/ は api/getStockList, helpers, errors に依存
- helpers/ は errors のみに依存 (純粋関数だがバリデーションで ValidationError を使用)

## WebSocket 対象外 (q15解決: out_of_scope)

- `/v3/realtime/` の WebSocket 実装は含めない
- `src/` 配下に `realtime` や `ws` 関連ディレクトリを作らない
- docsで対象外と明記するのみ。将来も本パッケージでは実装せず別パッケージ方針 (q15確定)

