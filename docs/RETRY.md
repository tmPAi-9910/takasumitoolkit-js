# リトライ設計 (RETRY)

## 概要

- リトライはクライアントの共通レイヤーで実装し、全 HTTP 関数で透過的に適用される
- 設定は `createKitClient` の `retry` オプションでカスタマイズ可能
- 既定値:
  - maxRetries: 3
  - initialDelayMs: 300
  - maxDelayMs: 5000
  - backoffFactor: 2
  - jitter: true

## リトライ対象 (retryable)

### 対象: リトライする

- `TakasumiBotKitNetworkError` — fetch がネットワークエラーで失敗
- `TakasumiBotKitTimeoutError` — タイムアウト
- `TakasumiBotKitHttpError` で status が:
  - 429 (Too Many Requests)
  - 500 (Internal Server Error)
  - 502 (Bad Gateway)
  - 503 (Service Unavailable)
  - 504 (Gateway Timeout)

### 非対象: リトライしない

- `TakasumiBotKitConfigError` — 設定エラー (q6解決: initial>maxもConfigError)
- `TakasumiBotKitValidationError` — 引数バリデーション、Stock limit 違反、Stock id 不存在 (q2解決: ValidationError確定)
- `TakasumiBotKitHttpError` で status が上記以外 (400,401,403,404,405,409,422 等)
- `TakasumiBotKitResponseParseError` — JSON パース失敗、zod 検証失敗 (2xxのみ)
- `TakasumiBotKitRetryLimitError` — 既に上限超過

※ 5xx 時の body が JSON でなくパース失敗した場合は HttpError として扱いリトライ対象とする (q17解決: http_priority)

## Backoff アルゴリズム

### 指数バックオフ

```
attempt: 0,1,2,... (0 = 初回失敗後の1回目リトライ)
delay = min(initialDelayMs * (backoffFactor ^ attempt), maxDelayMs)
```

例 (既定値: initial=300, factor=2, max=5000):
- attempt 0: 300ms
- attempt 1: 600ms
- attempt 2: 1200ms
- attempt 3: 2400ms
- attempt 4: 4800ms
- attempt 5: 5000ms (上限)

### Jitter (解決済み)

- `jitter: true` の場合、delay にランダム性を付与
- 確定実装: `jitteredDelay = delay * (0.5 + random() * 0.5)` → 50%〜100% の範囲。0に近いdelayによるthundering herdを避ける
- `jitter: false` の場合、delay をそのまま使用

### Retry-After 優先順位 (q5解決: clip_3x)

1. HTTP レスポンスに `Retry-After` ヘッダが存在し、パース可能な場合、それを優先して待機時間とする
2. `Retry-After` の形式:
   - 秒数: `120` → 120秒 = 120000ms
   - HTTP-date: `Wed, 21 Oct 2015 07:28:00 GMT` → 現在時刻との差分を ms に変換
   - パース失敗時は無視し、指数バックオフを使用
3. `Retry-After` の値が `maxDelayMs * 3` を超える場合は `maxDelayMs * 3` にクリップ (q5確定)。それ以下なら Retry-After を優先
4. `Retry-After` は主に 429, 503 で返却される想定だが、他の 5xx でも同様に扱う

優先順位まとめ (解決済み):

```
if (response.headers has Retry-After && parse succeeds) {
  delay = min(parsed Retry-After (ms), maxDelayMs * 3)
} else {
  delay = exponential backoff with jitter
  delay = min(delay, maxDelayMs)
}
```

## リトライフロー (擬似)

```ts
async function withRetry<T>(fn: () => Promise<T>, config: RetryConfig, context: { url, method, logger }): Promise<T> {
  let attempt = 0;
  let lastError: TakasumiBotKitError;
  while (true) {
    try {
      return await fn();
    } catch (e) {
      lastError = e as TakasumiBotKitError;
      if (!isRetryable(e)) throw e;
      if (attempt >= config.maxRetries) {
        throw new TakasumiBotKitRetryLimitError(..., { cause: lastError, attempts: attempt+1 });
      }
      const delay = computeDelay(attempt, config, e); // Retry-After 考慮
      logger?.warn(`Retry attempt ${attempt+1}/${config.maxRetries} after ${delay}ms due to ${e.name}: ${e.message}`, { url, method, attempt, delay });
      await sleep(delay);
      attempt++;
    }
  }
}
```

- `isRetryable(e)` は ERRORS.md の判定表に従う
- `computeDelay` は Backoff + Jitter + Retry-After を考慮
- `sleep` は `setTimeout` + `Promise`

## 上限超過時の挙動

- `maxRetries` 回リトライしても成功しない場合、`TakasumiBotKitRetryLimitError` を throw
- `RetryLimitError` のフィールド:
  - `cause`: 最後のエラー
  - `lastError`: 同上 (型付き)
  - `attempts`: 初回 + リトライ回数 = `maxRetries + 1`
  - `maxRetries`
  - `url`, `method`
- `retryable`: false (これ以上リトライしない)
- ログ: `logger.error` で上限超過を出力可能

## maxRetries = 0 の場合

- リトライなし。初回失敗時に即座に元のエラーを throw
- `RetryLimitError` は発生しない

## タイムアウトとリトライの相互作用

- 各試行で `timeoutMs` のタイムアウトが適用される
- タイムアウトした試行は `TakasumiBotKitTimeoutError` としてリトライ対象
- 全体のタイムアウト (total timeout) は設けない。各試行が独立して timeoutMs を持つ
- 将来的に total timeout を導入する場合は UNRESOLVED に記載

## ログ出力

- リトライ発生時: `logger.warn` または `logger.info` (本設計では `warn` を推奨)
  - メッセージ例: `Retrying ${method} ${url} (attempt ${attempt}/${maxRetries}) after ${delay}ms due to ${error.name}`
  - meta: `{ attempt, maxRetries, delay, error, url, method, status? }`
- リトライ成功時: `logger.info` で成功を出力してもよい (optional)
- 上限超過時: `logger.error`
- logger が未指定なら no-op

## 設定バリデーション (q6解決)

- `maxRetries`: 整数、0以上、NaN 不可 → 不正なら `TakasumiBotKitConfigError`
- `initialDelayMs`: 数値、0以上、NaN 不可 → 0 は即時リトライとして許可
- `maxDelayMs`: 数値、0以上。`initialDelayMs > maxDelayMs` の場合は `TakasumiBotKitConfigError` (q6: config_error確定)
- `backoffFactor`: 数値、1以上、NaN 不可 → 不正なら ConfigError
- `jitter`: boolean → 不正なら ConfigError

## テスト観点

- 429, 500, 502, 503, 504 でリトライされること
- 400, 404 等でリトライされないこと
- NetworkError, TimeoutError でリトライされること
- ValidationError, ConfigError, ParseError でリトライされないこと
- Backoff が指数関数的に増加すること
- jitter が有効/無効で動作が変わること
- Retry-After ヘッダ (秒数) が優先されること
- Retry-After ヘッダ (HTTP-date) が優先されること
- Retry-After パース失敗時に Backoff にフォールバックすること
- maxRetries=0 でリトライしないこと
- 上限超過時に RetryLimitError が throw され、cause が保持されること
- logger が呼ばれること

## 未解決事項

- なし (全て解決済み)
  - q5: Retry-AfterはmaxDelayMs*3でクリップ確定
  - q6: initial>maxはConfigError確定
  - q17: 5xxパース失敗はHttpError優先確定
  - total timeoutは現行では導入せず、各試行のtimeoutMsのみ (将来拡張余地あり)

