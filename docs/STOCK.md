# Stock 仕様 (STOCK) — 解決済み版

## 概要

- OpenAPI には `/v3/stock/` の一覧取得のみが存在し、`/v3/stock/{id}` や price/history 用の個別 HTTP エンドポイントは存在しない
- よって Stock 関連の個別取得はクライアント側で導出する
- **新規 HTTP リクエストは行わない** — `getStockList()` の結果をクライアント側でフィルタ・加工する
- 本ドキュメントはその導出仕様を定義する

## 前提: StockEntry 型 (解決済み q7)

OpenAPI `components.schemas.StockEntry`:

```ts
type StockEntry = {
  name: string;
  id: 'JTTI' | 'TENOMU' | 'KAKAPO' | 'TOMOTA' | 'NITIMOTO' | 'DEEDLE' | 'RIPPLE' | 'NIMURA' | 'TAKASUMI' | 'KENTAI';
  description: string;
  dividendAmount: bigint; // int64 → bigint対応 (q7解決)
  dividendRate: number;
  prices: bigint[]; // int64[] → bigint[] (q7解決)
};
```

- `id` は 10種類の enum
- `prices` は価格履歴の配列。時系列順序は「末尾が最新」(昇順) と確定 (q1: asc)。`[100,101,102]` なら 102が最新。

## 公開 API

### 1. getStockList()

- 既存の HTTP 関数。`GET /v3/stock/` を呼び出し `StockEntry[]` を返す
- Stock 導出の基礎となる
- TTL 60秒キャッシュを内部で持つ (q13解決)。`createKitClient` 内部で `stockListCache: { data, expiresAt }` を保持し、連続呼び出しではキャッシュを返す。キャッシュ無効化は TTL 経過または明示的オプション (将来拡張) で行う。

### 2. getStockInfoById(id: string)

擬似シグネチャ:

```ts
function getStockInfoById(id: string): Promise<StockEntry>;
```

- 動作:
  1. 引数 `id` をバリデーション: 非空 string。空なら `TakasumiBotKitValidationError` with code `INVALID_STOCK_ID`
  2. `getStockList()` を呼び出し一覧取得 (キャッシュ利用)
  3. `list.find(entry => entry.id === id)` で検索
  4. 見つかったらその `StockEntry` を返却 (zod 検証済み)
  5. 見つからない場合: `TakasumiBotKitValidationError` with `code: 'STOCK_NOT_FOUND'` を throw (q2解決: validation確定)。retryable false

- 戻り値: `StockEntry`

- エラー:
  - ValidationError: id 空、不正、または STOCK_NOT_FOUND
  - その他: getStockList() が throw するエラー (Network, Timeout, Http, Parse, RetryLimit)

### 3. getStockPriceById(id: string)

擬似シグネチャ (q3解決で null 許容):

```ts
function getStockPriceById(id: string): Promise<bigint | null>;
```

- 動作:
  1. `getStockInfoById(id)` で StockEntry 取得
  2. `prices` 配列の最新要素を返す。最新要素は末尾 (q1確定) → `prices[prices.length - 1]`
  3. `prices` が空配列の場合: `null` を返す (q3解決: return_null)。型は `bigint | null`

- 戻り値: `bigint | null` (最新価格、空なら null)

- エラー: getStockInfoById と同様。空配列はエラーではなく null

### 4. getStockHistoryById(id: string, options?: { limit?: number })

擬似シグネチャ:

```ts
type StockHistoryOptions = {
  limit?: number;
};

function getStockHistoryById(id: string, options?: StockHistoryOptions): Promise<bigint[]>;
```

- 動作:
  1. `getStockInfoById(id)` で StockEntry 取得
  2. `prices` を対象に limit 規則を適用し、新しい順 (newest-first) にソートして返す

- limit 規則 (確定方針):
  - `options` 未指定 or `options.limit` が `undefined` → 全件を新しい順に返す
  - `n === 0` → `[]` を返す (空配列)
  - `n < 0` → `TakasumiBotKitValidationError` (code: 'INVALID_LIMIT')
  - `NaN` または整数でない → `TakasumiBotKitValidationError`
  - 有効な正の整数 → `prices.slice(-n)` を新しい順にソートして返す

- ソート順 (q1解決):
  - 前提: `prices` の末尾が最新 (昇順)
  - 戻り値は新しい順 (降順) に `reverse()` する
  - 実装: `const sliced = limit !== undefined ? prices.slice(-limit) : prices.slice(); return sliced.reverse();`
  - 例: API `[100,101,102,103]` → 全件 `[103,102,101,100]`, limit 2 → `[103,102]`

- 戻り値: `bigint[]` (新しい順)

- エラー:
  - ValidationError: limit 規則違反、id 不存在

### 5. ビルダー: getStock().id(id)

擬似シグネチャ (q3解決反映):

```ts
type StockBuilder = {
  id(id: string): StockIdBuilder;
};

type StockIdBuilder = {
  info(): Promise<StockEntry>;
  price(): Promise<bigint | null>;
  history(options?: { limit?: number }): Promise<bigint[]>;
};

function getStock(): StockBuilder;
```

- 動作:
  - `kit.getStock()` は StockBuilder オブジェクトを返す。HTTP リクエストはこの時点では行わない
  - `.id(id)` で id を束縛し、StockIdBuilder を返す。ここでも HTTP リクエストは行わない (lazy)
  - `.info()`, `.price()`, `.history()` 呼び出し時に初めて `getStockList()` (キャッシュ利用) → 検索 → 加工が行われる
  - 各メソッドは上記個別関数と同等の動作をする
  - TTL 60秒キャッシュにより、`info()` と `price()` を連続呼び出ししても 1回のみ HTTP (q13解決)

- チェーン例:
  ```ts
  const info = await kit.getStock().id('JTTI').info();
  const price = await kit.getStock().id('JTTI').price(); // bigint | null
  const history = await kit.getStock().id('JTTI').history({ limit: 5 });
  ```

- エラー: 個別関数と同様

- 備考:
  - ビルダーは immutable。`id()` 呼び出しごとに新しい StockIdBuilder を生成
  - `getStock().id(id)` の id バリデーションは `id()` 時点で ValidationError を throw (fail fast)

## キャッシュ戦略 (q13解決: ttl_60)

- TTL 60秒キャッシュを導入
- 実装イメージ:
  ```ts
  type StockCache = {
    data: StockEntry[];
    expiresAt: number; // Date.now() + 60000
  };
  ```
- `getStockList()` 呼び出し時、キャッシュが有効 (expiresAt > now) ならキャッシュを返す
- TTL 経過で再取得
- 将来拡張: `createKitClient({ cache: { stockTtlMs: number } })` で TTL カスタマイズ可能にする案もあるが、現行は 60秒固定で実装
- キャッシュはクライアントインスタンスごとに独立

## バリデーション

- `id`: string, 非空, trim 後非空。enum 10種以外でも一旦検索を試み、見つからなければ STOCK_NOT_FOUND (ValidationError)
- `limit`: 上記規則通り

## エラー種別統一 (解決済み)

| ケース | エラー種別 | code | retryable |
|--------|------------|------|-----------|
| id 空文字 | ValidationError | INVALID_STOCK_ID | false |
| id が一覧に存在しない | ValidationError (確定 q2) | STOCK_NOT_FOUND | false |
| limit < 0 | ValidationError | INVALID_LIMIT | false |
| limit NaN / 非整数 | ValidationError | INVALID_LIMIT | false |
| limit 0 | 正常: [] | - | - |
| prices 空で price() 呼び出し | 正常: null (確定 q3) | - | - |
| getStockList() 失敗 | そのまま伝播 | - | 元のエラーの retryable に従う |

## 戻り値の新しい順ソート (q1解決)

- 前提: `prices` の末尾が新しい (昇順)
- 戻り値は新しい順 (降順) に `reverse()`
- 例: `[100,101,102,103]` → 最新103, history(limit2) `[103,102]`, 全件 `[103,102,101,100]`

## ヘルパーとの関係

- `getRecentStockHistory(history, limit)` は Stock history の limit 規則と同じロジックを持つ純粋関数。Stock 導出関数の内部で再利用可能。戻り値は `bigint[]` (bigint対応)
- 詳細は HELPERS.md 参照

## テスト観点 (解決済み反映)

- getStockList() のモックが呼ばれ、新規 HTTP リクエスト (例: /v3/stock/JTTI) が発生しないこと
- キャッシュ: 2回連続呼び出しで fetch が1回のみ呼ばれる (TTL内)
- id 検索が正しく動作すること
- id 不存在時に ValidationError (STOCK_NOT_FOUND) が throw されること (q2)
- price() が最新要素 (末尾) を返すこと、空配列で null を返すこと (q3)
- history() が新しい順にソートされること (q1)
- limit 規則: 0→[], 負→ValidationError, NaN→ValidationError, 非整数→ValidationError, 正の整数→slice(-n).reverse(), 未指定→全件 reverse
- ビルダー: getStock().id(id).info() 等が個別関数と同等の結果を返すこと
- ビルダー: id() 時点でのバリデーション

## 未解決事項

- なし (全て解決済み q1-q17)
