# テスト計画 (TEST_PLAN)

## 方針

- テストランナー: Vitest
- 環境: node (Node.js 20+)
- モック方針:
  - `fetch` は `config.fetch` にモックを注入、または `vi.stubGlobal('fetch', mockFetch)` で差し替え
  - `openapi-typescript` 生成型はモックせず、実際の型を使用
  - `zod` スキーマは実際に検証する (モックしない)
  - タイマー: `vi.useFakeTimers()` で backoff の sleep をテスト
  - 環境変数: `vi.stubEnv('TAKASUMIBOT_BASE_URL', ...)` または `process.env` を一時的に書き換え
  - logger: `vi.fn()` でモックし、呼び出し回数を検証
- カバレッジ目標: 80%以上 (branch 含む)
- `any` 禁止、テストコードも strict
- 各テストは独立、副作用なし

## モックヘルパー

### fetch モック

擬似:

```ts
function createMockFetch(responses: Array<{ status: number; body: unknown; headers?: Record<string,string> } | Error>) {
  let callCount = 0;
  return vi.fn(async (url: string, init?: RequestInit) => {
    const res = responses[callCount++];
    if (res instanceof Error) throw res;
    return {
      ok: res.status >=200 && res.status <300,
      status: res.status,
      statusText: 'OK',
      headers: new Headers(res.headers),
      json: async () => res.body,
      text: async () => JSON.stringify(res.body),
    } as Response;
  });
}
```

- 成功レスポンス、失敗レスポンス、ネットワークエラー (throw) をシミュレート
- Retry-After ヘッダを含むレスポンスもテスト

### logger モック

```ts
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};
```

## テストケース一覧 (最低限)

### 1. client/createKitClient.test.ts

- [ ] config なしで生成できる、既定値が適用される
- [ ] timeoutMs, retry, headers, fetch, logger がマージされる
- [ ] baseUrl が readonly で取得できる
- [ ] 環境変数 TAKASUMIBOT_BASE_URL が既定より優先される
- [ ] 環境変数が空文字なら既定が使われる
- [ ] 不正な timeoutMs で ConfigError
- [ ] 不正な retry.maxRetries で ConfigError
- [ ] 不正な fetch (非関数) で ConfigError
- [ ] headers がマージされる (カスタムヘッダが送信される)

### 2. client/baseUrl.test.ts

- [ ] resolveBaseUrl が env > default の優先順位で返す
- [ ] normalize で末尾スラッシュが除去される
- [ ] joinUrl で baseUrl + path の末尾スラッシュ除去が正しく行われる

### 3. api/fetcher.test.ts (共通)

- [ ] 2xx レスポンスで zod 検証後にデータを返す
- [ ] 非2xx で HttpError を throw
- [ ] JSON パース失敗で ParseError
- [ ] zod 検証失敗で ParseError、zodIssues が含まれる
- [ ] ネットワークエラー (fetch throw) で NetworkError
- [ ] タイムアウトで TimeoutError
- [ ] パス末尾スラッシュが除去された URL で fetch が呼ばれる
- [ ] headers が正しくマージされる
- [ ] リトライ対象エラーでリトライされる (withRetry 経由)

### 4. 各 API 関数 (getGiftInfo, getTaxInfo, etc)

各関数で以下をテスト:

- [ ] 正常系: モック fetch が期待 URL で呼ばれ、正しい型が返る
- [ ] 引数バリデーション: 不正引数で ValidationError (例: getGiftInfo('short'))
- [ ] HttpError: 404, 500 等のモックで HttpError
- [ ] NetworkError, TimeoutError, ParseError の伝播
- [ ] RetryLimitError の伝播 (リトライ上限超過)
- [ ] getGiftInfo: id 10文字以外で ValidationError
- [ ] getDiscordUserByName: 空文字/空白のみで ValidationError
- [ ] getHistoryById, getProfileById, getCompanyById, getCompanyHistoryById: 空文字で ValidationError
- [ ] getTaxInfo, getShardInfo, etc 引数なし系: 引数なしで正常に動作

### 5. stock/

#### getStockList.test.ts

- [ ] 正常系: StockEntry[] を返す (bigint含む q7)
- [ ] zod 検証失敗で ParseError
- [ ] TTL60秒キャッシュで2回目fetchが呼ばれない (q13)
- [ ] TTL経過後は再fetchされる

#### getStockInfoById.test.ts

- [ ] 存在する id で StockEntry を返す
- [ ] 存在しない id で ValidationError (STOCK_NOT_FOUND)
- [ ] 空 id で ValidationError
- [ ] getStockList が失敗した場合、そのエラーが伝播
- [ ] 新規 HTTP リクエストが発生しない (getStockList のみ呼ばれる)

#### getStockPriceById.test.ts (q1,q3解決)

- [ ] 正常系: 最新価格を返す (末尾要素、q1確定: asc)
- [ ] prices 空配列で null を返す (q3解決: return_null)
- [ ] id 不存在で ValidationError(STOCK_NOT_FOUND) (q2確定)
- [ ] bigint型で返ること (q7解決)

#### getStockHistoryById.test.ts (q1解決)

- [ ] limit 未指定で全件新しい順 (末尾が最新確定 q1)
- [ ] limit 0 で []
- [ ] limit 負で ValidationError
- [ ] limit NaN, 非整数で ValidationError
- [ ] limit 正の整数で slice(-n) + reverse
- [ ] limit が配列長を超える場合、全件新しい順
- [ ] 新しい順ソートが正しい (末尾が最新確定)
- [ ] bigint配列で返ること (q7)

#### builder.test.ts

- [ ] getStock().id(id).info() が getStockInfoById と同等
- [ ] getStock().id(id).price() が getStockPriceById と同等
- [ ] getStock().id(id).history() が getStockHistoryById と同等
- [ ] getStock().id('') で ValidationError (fail fast)
- [ ] ビルダーが lazy (id() 時点では fetch しない、メソッド呼び出し時に fetch)

### 6. errors/

- [ ] 各エラークラスが TakasumiBotKitError を継承
- [ ] 各エラーが Error を継承
- [ ] name がクラス名と一致
- [ ] cause が保持される
- [ ] retryable が期待通り (判定表参照)
- [ ] HttpError の status, url, method, body が保持される
- [ ] ValidationError の field, value, code が保持される
- [ ] RetryLimitError の attempts, lastError が保持される

### 7. retry/

#### isRetryable.test.ts

- [ ] NetworkError → true
- [ ] TimeoutError → true
- [ ] HttpError 429,500,502,503,504 → true
- [ ] HttpError 400,401,403,404 → false
- [ ] ValidationError, ConfigError, ParseError, RetryLimitError → false

#### backoff.test.ts (q5解決)

- [ ] 指数バックオフ計算が正しい (initial * factor^attempt)
- [ ] maxDelayMs でクリップされる
- [ ] jitter true で 50-100% の範囲に収まる (確定)
- [ ] jitter false で jitter なし
- [ ] Retry-After 秒数がパースされ優先される
- [ ] Retry-After が maxDelayMs*3でクリップされる (q5: clip_3x確定)
- [ ] Retry-After HTTP-date がパースされ優先される
- [ ] Retry-After パース失敗で backoff にフォールバック

#### withRetry.test.ts

- [ ] 成功時は1回で返る、リトライなし
- [ ] retryable エラーで maxRetries 回リトライ
- [ ] 非 retryable エラーで即時 throw、リトライなし
- [ ] maxRetries=0 でリトライなし
- [ ] 上限超過で RetryLimitError、cause が最後のエラー
- [ ] リトライ時に logger.warn が呼ばれる
- [ ] sleep が backoff 計算通りの delay で呼ばれる (fake timers)

### 8. helpers/

#### truncate.test.ts (q11解決)

- [ ] 正常系: 長い文字列が切り詰められる
- [ ] 短い文字列はそのまま
- [ ] maxLength 0 で空文字
- [ ] ellipsis が maxLength に含まれる (q11確定: include、例 he...で5文字)
- [ ] 不正引数で ValidationError

#### pickFields.test.ts / omitFields.test.ts

- [ ] 正常系: 指定 keys のみ抽出/除外
- [ ] 存在しない key は無視
- [ ] 元オブジェクトを変更しない
- [ ] 不正引数で ValidationError

#### toMarkdownTable.test.ts (q12解決)

- [ ] 正常系: Markdown テーブル生成
- [ ] 空配列で空文字
- [ ] headers オプションでヘッダ順指定
- [ ] align オプションでアラインメント
- [ ] | → \| エスケープ、改行 → <br> (q12確定: pipe_escape_br)、null/undefinedは空文字
- [ ] bigint値も文字列化される (q7)
- [ ] 不正引数で ValidationError

#### formatNumber.test.ts (q7,q9解決)

- [ ] 正常系: カンマ区切り等、ja-JP既定 (q9)
- [ ] bigint対応 (q7): 1234567n → '1,234,567'
- [ ] locale, fractionDigits オプション
- [ ] NaN, 非数値で ValidationError

#### formatTimestamp.test.ts (q9解決)

- [ ] ISO 文字列、Date、number(ms)からのパース
- [ ] bigint(ms)からのパース (q7)
- [ ] format iso, locale, relative、locale既定ja-JP (q9)
- [ ] 不正な日付で ValidationError

#### paginate.test.ts (q10解決)

- [ ] 1ページ目が正しい
- [ ] 2ページ目が正しい
- [ ] page が totalPages 超えで空配列 (q10確定: empty)
- [ ] hasNext, hasPrev が正しい
- [ ] page 1-based であること
- [ ] 不正引数 (0, 負, NaN, 非整数) で ValidationError

#### getRecentStockHistory.test.ts (q1解決)

- [ ] limit 規則が Stock と同じ (0→[], 負→Error, NaN→Error, 非整数→Error, 正→slice(-n).reverse(), 未指定→全件 reverse)
- [ ] 新しい順ソート (末尾が最新確定 q1)
- [ ] history が配列でない、数値/bigint以外含むで ValidationError
- [ ] bigint対応 (q7)

### 9. 統合テスト (optional)

- [ ] createKitClient → getTaxInfo → モック fetch → 成功
- [ ] createKitClient with custom fetch → getStockList → getStockInfoById → 成功、新規 HTTP なし
- [ ] リトライ統合: 500→500→200 で成功、fetch が3回呼ばれる

## カバレッジ

- `vitest --coverage` で計測
- 目標: lines 80%, branches 80%
- 未カバー箇所は UNRESOLVED または TODO コメントで理由を明記

## CI 連携 (将来)

- `npm run typecheck` (tsc --noEmit)
- `npm run lint` (eslint)
- `npm run test` (vitest)
- `npm run build` (tsup)

全てが green であることを受け入れ基準とする。

## WebSocket 対象外

- `/v3/realtime/` のテストは含めない

