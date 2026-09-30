# エラー設計 (ERRORS)

## 概要

- 全エラーは `TakasumiBotKitError` を基底とする
- 各エラーは `name`, `message`, `cause`, `retryable` (可能なら) を持つ
- `instanceof` で判定可能にする
- `Error` 標準の `cause` (ES2022) を使用
- TypeScript strict, `any` 禁止

## クラス階層

```
Error (標準)
└─ TakasumiBotKitError (基底)
   ├─ TakasumiBotKitConfigError
   ├─ TakasumiBotKitValidationError
   ├─ TakasumiBotKitHttpError
   ├─ TakasumiBotKitNetworkError
   ├─ TakasumiBotKitTimeoutError
   ├─ TakasumiBotKitRetryLimitError
   └─ TakasumiBotKitResponseParseError
```

全クラスは `TakasumiBotKitError` を継承する。

## 基底クラス

### TakasumiBotKitError

擬似定義:

```ts
class TakasumiBotKitError extends Error {
  name: string; // 'TakasumiBotKitError'
  message: string;
  cause?: unknown;
  retryable?: boolean;
  constructor(message: string, options?: { cause?: unknown; retryable?: boolean });
}
```

- `name` はクラス名と一致させる (`TakasumiBotKitError`)
- `retryable` は optional boolean。基底では undefined または false
- 全派生クラスはこの基底のフィールドを継承

## 派生クラス詳細

### 1. TakasumiBotKitConfigError

- 用途: クライアント生成時の config 不正
- 発生例:
  - `timeoutMs` が NaN, 負数, 非数値
  - `retry.maxRetries` が負数, NaN, 非整数
  - `headers` が object でない
  - `fetch` が関数でない
  - `logger` が object でない (ただし寛容に扱う案もある)
- フィールド:
  - `name`: 'TakasumiBotKitConfigError'
  - `message`: 人間可読な説明 (例: 'timeoutMs must be a positive number')
  - `cause?`: 元のエラーまたは不正値
  - `retryable`: false (固定)
  - 追加フィールド案:
    - `field?: string` — どの config フィールドが不正か
    - `value?: unknown` — 不正な値
- retryable: false
- JSDoc: @example 付き

### 2. TakasumiBotKitValidationError (解決済み q2,q16)

- 用途: 関数引数のバリデーション失敗、Stock limit 規則違反、Stock id 不存在
- 発生例:
  - `getGiftInfo('')` 空文字、または `/^[A-Za-z0-9]{10}$/` に不一致 (q16: strict_regex確定)
  - `getHistoryById('')` 空
  - `getDiscordUserByName('   ')` trim 後空
  - Stock history limit が `n < 0`, `NaN`, 非整数
  - Stock id が見つからない → `code: 'STOCK_NOT_FOUND'` (q2解決: ValidationError確定)
- フィールド:
  - `name`: 'TakasumiBotKitValidationError'
  - `message`: string
  - `cause?`: 元の zod エラーやバリデーション詳細
  - `retryable`: false
  - 追加フィールド:
    - `field?: string` — 不正な引数名 (例: 'id', 'limit')
    - `value?: unknown` — 不正な値
    - `code?: string` — 機械可読コード (例: 'INVALID_GIFT_ID', 'INVALID_LIMIT', 'STOCK_NOT_FOUND', 'EMPTY_PRICES')
- retryable: false
- 備考: クライアント側で即時 throw、リトライ対象外

### 3. TakasumiBotKitHttpError

- 用途: HTTP ステータスが 2xx 以外
- 発生タイミング: fetch 成功だが status が 400-599
- フィールド:
  - `name`: 'TakasumiBotKitHttpError'
  - `message`: `HTTP ${status} ${statusText}` または body からのメッセージ
  - `cause?`: 元の Response または body パースエラー
  - `retryable`: boolean — status により決定 (429,500,502,503,504 は true)
  - `status: number` — HTTP ステータスコード
  - `statusText?: string`
  - `code?: string` — API が返すエラーコードがあれば (OpenAPI には定義なし、body から抽出を試みる)
  - `requestId?: string` — `x-request-id` ヘッダや body から抽出できれば
  - `url: string` — リクエスト URL
  - `method: string` — HTTP メソッド
  - `headers?: Record<string, string>` — レスポンスヘッダ (必要なもののみ)
  - `body?: unknown` — パース済み body (JSON なら object、テキストなら string)
  - `rawBody?: string` — 生 body テキスト (デバッグ用、任意)
- retryable 判定:
  - 429, 500, 502, 503, 504 → true
  - その他 4xx → false
  - ただし `Retry-After` ヘッダがある 429 は特にリトライ対象
- 追加仕様 (q4解決: best_effort):
  - body が JSON で `{ code, message, requestId }` 形式なら抽出を試みる。OpenAPIに定義なしのためベストエフォート
  - `requestId` はヘッダ `x-request-id`, `x-requestId`, `request-id`, `x-takasumibot-request-id` を順に探し、次に body の `requestId`, `request_id`, `id` を探索
  - `code` は body の `code`, `errorCode`, `error_code` を順に探索
  - 見つからなくてもエラーとしては成立、undefinedを許容

### 4. TakasumiBotKitNetworkError

- 用途: fetch がネットワークエラーで throw (DNS 失敗、接続拒否等)
- フィールド:
  - `name`: 'TakasumiBotKitNetworkError'
  - `message`: string (例: 'Network error: ...')
  - `cause`: 元の fetch エラー (TypeError 等)
  - `retryable`: true
  - `url`: string
  - `method`: string
- retryable: true

### 5. TakasumiBotKitTimeoutError

- 用途: AbortController によるタイムアウト
- フィールド:
  - `name`: 'TakasumiBotKitTimeoutError'
  - `message`: `Request timed out after ${timeoutMs}ms`
  - `cause?`: AbortError
  - `retryable`: true
  - `timeoutMs: number`
  - `url`: string
  - `method`: string
- retryable: true
- 実装: `AbortSignal.timeout(timeoutMs)` または `AbortController` + `setTimeout`

### 6. TakasumiBotKitRetryLimitError

- 用途: リトライ上限超過
- フィールド:
  - `name`: 'TakasumiBotKitRetryLimitError'
  - `message`: `Retry limit exceeded after ${attempts} attempts`
  - `cause`: 最後のエラー (NetworkError, TimeoutError, HttpError のいずれか)
  - `retryable`: false (上限超過後はリトライしない)
  - `attempts: number` — 試行回数 (初回 + リトライ回数)
  - `maxRetries: number`
  - `lastError: TakasumiBotKitError` — cause と同等だが型付きで保持
  - `url`: string
  - `method`: string
- retryable: false (ただし cause の retryable は true だった)

### 7. TakasumiBotKitResponseParseError

- 用途: JSON パース失敗、または zod 検証失敗
- フィールド (q17解決: http_priority):
  - `name`: 'TakasumiBotKitResponseParseError'
  - `message`: string
  - `cause`: 元の SyntaxError または ZodError
  - `retryable`: false
  - `url`: string
  - `method`: string
  - `status`: number — HTTP ステータス (パース失敗時でも取得可能なら)
  - `rawBody?: string` — パース失敗時の生 body
  - `zodIssues?: ZodIssue[]` — zod 失敗時の issues
- retryable: false
- 備考 (q17確定): 5xx レスポンスが JSON でない場合は HttpError として扱い rawBody を保持。zod検証失敗 (2xx) は ParseError。

## retryable 判定表

| エラークラス | 条件 | retryable | リトライ対象? |
|--------------|------|-----------|---------------|
| TakasumiBotKitConfigError | 常に | false | No |
| TakasumiBotKitValidationError | 常に | false | No |
| TakasumiBotKitHttpError | status 429 | true | Yes |
| TakasumiBotKitHttpError | status 500,502,503,504 | true | Yes |
| TakasumiBotKitHttpError | status 400,401,403,404,405,409,422 等 | false | No |
| TakasumiBotKitNetworkError | 常に | true | Yes |
| TakasumiBotKitTimeoutError | 常に | true | Yes |
| TakasumiBotKitRetryLimitError | 常に | false | No (上限超過) |
| TakasumiBotKitResponseParseError | 常に | false | No |

※ HttpError の retryable は status による。429 は Retry-After 優先。

## エラーメッセージ方針

- 英語で簡潔、かつ人間可読
- 可能な限り `field`, `value`, `url`, `status` を含める
- 機密情報 (apiKey 等) は本パッケージでは扱わないため考慮不要だが、将来的には含めない

## エラー生成ヘルパー (内部)

擬似シグネチャ:

```ts
function createHttpError(input: { status, statusText, url, method, headers, body, rawBody }): TakasumiBotKitHttpError;
function createNetworkError(cause: unknown, context: { url, method }): TakasumiBotKitNetworkError;
function createTimeoutError(timeoutMs: number, context: { url, method }, cause?: unknown): TakasumiBotKitTimeoutError;
function createValidationError(message: string, field?: string, value?: unknown, code?: string): TakasumiBotKitValidationError;
function createConfigError(message: string, field?: string, value?: unknown): TakasumiBotKitConfigError;
function createParseError(message: string, cause: unknown, context: { url, method, status?, rawBody? }): TakasumiBotKitResponseParseError;
function createRetryLimitError(lastError: TakasumiBotKitError, attempts: number, maxRetries: number, context: { url, method }): TakasumiBotKitRetryLimitError;
```

## ログ出力

- エラー発生時は `logger.error` で出力可能にするが、throw 前に必ずログを出すわけではない。呼び出し側が catch してログ出力するのが原則。
- リトライ中は `logger.warn` でリトライ情報を出力 (RETRY.md 参照)

## テスト観点

- 各エラークラスが `instanceof TakasumiBotKitError` かつ `instanceof Error` であること
- `name` がクラス名と一致すること
- `cause` が保持されていること
- `retryable` が期待通りであること
- HttpError の status, url, method が正しくセットされること
- ValidationError の field, value, code が正しいこと

## 未解決事項

- なし (全て解決済み)
  - q2: Stock id不存在は ValidationError(STOCK_NOT_FOUND)確定
  - q4: HttpError code/requestIdはベストエフォート探索で確定
  - q7: int64はbigint対応で確定
  - q17: 5xxパース失敗はHttpError優先で確定

