# 未解決事項 (UNRESOLVED) — 解決済み

当初17件あった未解決事項は全て解決済み。現時点では未解決事項なし。

## 解決済み一覧 (q1-q17)

### q1. StockEntry.prices の時系列順序
- **決定:** 末尾が最新 (昇順) `[100,101,102]` → 102が最新 (asc)
- **反映:** SPEC.md, STOCK.md, HELPERS.md, TEST_PLAN.md で `slice(-n).reverse()` で新しい順に確定

### q2. Stock id 不存在時のエラー種別
- **決定:** `TakasumiBotKitValidationError` with `code: 'STOCK_NOT_FOUND'` (validation)
- **反映:** SPEC.md, STOCK.md, ERRORS.md, TEST_PLAN.md

### q3. Stock prices 空配列時の getStockPriceById の挙動
- **決定:** `null` を返す、型は `Promise<bigint | null>` に変更 (return_null)
- **反映:** SPEC.md, STOCK.md, API_FUNCTIONS.md, PROJECT_STRUCTURE.md, TEST_PLAN.md

### q4. HttpError の code / requestId 抽出元
- **決定:** ベストエフォートで探す (best_effort)
- ヘッダ: `x-request-id`, `x-requestId`, `request-id`, `x-takasumibot-request-id` 順
- body: `code`→`errorCode`→`error_code`, `requestId`→`request_id`→`id` 順
- **反映:** ERRORS.md

### q5. Retry-After ヘッダの扱い
- **決定:** `maxDelayMs * 3` でクリップ (clip_3x)
- 例: maxDelayMs 5000なら上限15000ms、Retry-After 3600秒は15000msにクリップ
- **反映:** SPEC.md, RETRY.md, TEST_PLAN.md

### q6. initialDelayMs > maxDelayMs の場合の扱い
- **決定:** `TakasumiBotKitConfigError` を throw (config_error)
- **反映:** SPEC.md, RETRY.md

### q7. int64 の JS number 安全範囲超え
- **決定:** `bigint` 対応 (bigint)
- `StockEntry.prices`, `dividendAmount`, `assets`等を bigint で扱う。zodは `z.bigint()` または string→bigint変換
- helpers `formatNumber` も bigint対応
- **反映:** SPEC.md, STOCK.md, ERRORS.md, PROJECT_STRUCTURE.md, HELPERS.md, TEST_PLAN.md

### q8. zod 未知フィールドの扱い
- **決定:** `.passthrough()` で保持 (passthrough)
- API追加フィールドで壊れないようにする
- **反映:** SPEC.md, PROJECT_STRUCTURE.md

### q9. formatNumber / formatTimestamp の既定 locale
- **決定:** `ja-JP` (ja-JP)
- TakasumiBOTが日本発のため ja-JP を既定、optionsで上書き可能
- **反映:** SPEC.md, HELPERS.md, TEST_PLAN.md

### q10. paginate の totalPages 超え時の挙動
- **決定:** 空配列を返す (empty)
- エラーにせず `[]` を返し `hasNext=false` 等を維持
- **反映:** SPEC.md, HELPERS.md, TEST_PLAN.md

### q11. truncate の ellipsis 扱い
- **決定:** maxLengthに含める (include)
- 例: `truncate('hello world', 5)` → `'he...'`
- **反映:** SPEC.md, HELPERS.md, TEST_PLAN.md

### q12. toMarkdownTable のエスケープ規則
- **決定:** `|`→`\|`, 改行→`<br>` (pipe_escape_br)
- **反映:** SPEC.md, HELPERS.md, TEST_PLAN.md

### q13. キャッシュ戦略 (Stock)
- **決定:** TTL 60秒キャッシュ (ttl_60)
- `getStockList()` にTTL60秒キャッシュを導入、クライアントインスタンスごとに保持
- **反映:** SPEC.md, STOCK.md, PROJECT_STRUCTURE.md, TEST_PLAN.md

### q14. baseUrl 解決のブラウザ対応
- **決定:** Node/Bunのみ (node_bun_only)
- `process.env.TAKASUMIBOT_BASE_URL` のみ参照、process未定義なら既定baseUrl使用
- **反映:** SPEC.md (変更なし)

### q15. WebSocket /v3/realtime/ の将来対応
- **決定:** 対象外のまま (out_of_scope)
- 本パッケージでは実装せず、将来も別パッケージ方針
- **反映:** SPEC.md, PROJECT_STRUCTURE.md

### q16. Gift ID のバリデーション厳格さ
- **決定:** 厳密 `/^[A-Za-z0-9]{10}$/` (strict_regex)
- fail fastで ValidationError
- **反映:** SPEC.md, ERRORS.md

### q17. 5xx 時の ParseError vs HttpError
- **決定:** HttpError優先 (http_priority)
- 5xxでbodyがJSONでない場合はHttpErrorとしてrawBody保持、2xxのzod失敗のみParseError
- **反映:** SPEC.md, ERRORS.md, RETRY.md, PROJECT_STRUCTURE.md

---

## 実装フェーズで確定した事項 (未解決ではなく確定事項)

実装時に Plan 段階の決定をより具体化した点。いずれも「未解決」ではなく確定済み。

1. **Stock キャッシュの既定**: q13 (ttl_60) は「TTL 60秒」を維持しつつ、**既定は無効・オプション有効**に確定。
   `basicConfig.stockCache: false | { ttlMs?: number }` で、`ttlMs <= 0` は `TakasumiBotKitConfigError` (無効扱いにはしない)。
2. **bigint パース方式 A**: `response.json()` は使わず `response.text()` → 独自 JSON スキャナ (安全整数超えの整数のみ bigint) → zod 検証。
3. **required の扱い**: OpenAPI は `required` を宣言していないが、SPEC §14 の公開型イメージに従いドキュメント化済みプロパティは required として検証する。未知フィールドは `.passthrough()` で保持。
4. **single-flight**: キャッシュ有効時の同時未ヒットは任意実装だったが、in-flight Promise 共有方式で採用。
5. **相対時刻表記**: `formatTimestamp(..., { format: 'relative' })` は `Intl.RelativeTimeFormat` に委譲するため、日本語の 0 秒差分は「今」(docs 初版の例示「たった今」ではなく Intl の出力)。
6. **`formatTimestamp` の `'custom'` 形式**: HELPERS.md に「将来拡張」として記載されていたが書式仕様が無いため未実装。`'iso' | 'locale' | 'relative'` のみ提供。

---

## 現状

なし — 全て解決済み。上記決定を各ドキュメントに反映済み。
