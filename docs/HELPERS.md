# ヘルパー仕様 (HELPERS)

## 概要

- 純粋関数、副作用なし、外部依存なしを原則
- `any` 禁止、TypeScript strict
- 全ヘルパーは named export または `kit.helpers` 経由で公開
- JSDoc 必須 (概要/@param/@returns/@throws/@example)
- バリデーション失敗時は `TakasumiBotKitValidationError` を throw するか、または元の値をそのまま返すかは関数ごとに定義

## 一覧

| 関数名 | 入出力概要 | 備考 |
|--------|------------|------|
| `truncate(text, maxLength)` | string を maxLength で切り詰め | |
| `pickFields(object, keys)` | object から指定 keys のみ抽出 | |
| `omitFields(object, keys)` | object から指定 keys を除外 | |
| `toMarkdownTable(rows)` | 行データから Markdown テーブル生成 | |
| `formatNumber(value, options?)` | 数値をフォーマット | |
| `formatTimestamp(value, options?)` | タイムスタンプをフォーマット | |
| `paginate(items, page, pageSize)` | 配列をページング (1-based) | |
| `getRecentStockHistory(history, limit)` | Stock history limit 規則と同じ | |

## 個別仕様

### 1. truncate(text, maxLength) (q11解決: include)

擬似シグネチャ:

```ts
function truncate(text: string, maxLength: number, options?: { ellipsis?: string }): string;
```

- 引数:
  - `text: string` — 対象文字列、必須
  - `maxLength: number` — 最大長、必須、0以上の整数。0なら '' を返す
  - `options.ellipsis?: string` — 省略記号、既定 '...'。maxLengthに含める (q11確定)
- 戻り値: `string` — maxLength 以下に切り詰められた文字列
- 動作:
  - `text.length <= maxLength` ならそのまま返す
  - 超える場合、`text.slice(0, maxLength - ellipsis.length) + ellipsis` (例: maxLength5, ellipsis'...'なら 'ab...' =2文字+'...'で5)
  - `maxLength <= ellipsis.length` の場合は `text.slice(0, maxLength)` (ellipsis付けない)
    - 例: `truncate('hello world', 3)` → `'hel'`、`truncate('hello world', 4)` → `'h...'`
- エラー:
  - `text` が string でない → ValidationError
  - `maxLength` が負、NaN、非整数 → ValidationError
- JSDoc 例:
  ```ts
  truncate('hello world', 5) // 'he...' (q11: include確定)
  truncate('hello', 10) // 'hello'
  ```

### 2. pickFields(object, keys)

擬似シグネチャ:

```ts
function pickFields<T extends object, K extends keyof T>(object: T, keys: readonly K[]): Pick<T, K>;
```

- 引数:
  - `object: T` — 対象オブジェクト、必須、null/undefined 不可
  - `keys: readonly K[]` — 抽出するキーの配列、必須
- 戻り値: `Pick<T,K>` — keys に含まれるプロパティのみを持つ新しいオブジェクト
- 動作:
  - keys に存在しないキーは無視 (または undefined を含めない)
  - 元オブジェクトは変更しない (shallow copy)
  - プロトタイプ汚染対策: `__proto__`, `constructor` 等は無視するか、通常の `hasOwnProperty` チェックで対応
- エラー:
  - object が null/undefined/object でない → ValidationError
  - keys が配列でない → ValidationError
- 例:
  ```ts
  pickFields({a:1,b:2,c:3}, ['a','c']) // {a:1,c:3}
  ```

### 3. omitFields(object, keys)

擬似シグネチャ:

```ts
function omitFields<T extends object, K extends keyof T>(object: T, keys: readonly K[]): Omit<T, K>;
```

- 引数: pickFields と同様
- 戻り値: `Omit<T,K>` — keys を除外した新しいオブジェクト
- 動作:
  - 元オブジェクトは変更しない
  - keys に含まれないプロパティのみを残す
- エラー: pickFields と同様
- 例:
  ```ts
  omitFields({a:1,b:2,c:3}, ['b']) // {a:1,c:3}
  ```

### 4. toMarkdownTable(rows) (q12解決: pipe_escape_br)

擬似シグネチャ:

```ts
type TableRow = Record<string, string | number | boolean | null | undefined | bigint>;
function toMarkdownTable(rows: TableRow[], options?: { headers?: string[]; align?: ('left'|'center'|'right')[] }): string;
```

- 引数:
  - `rows: TableRow[]` — テーブル行、必須、空配列なら '' を返す
  - `options.headers?: string[]` — 明示的ヘッダ順。未指定なら rows[0] の keys から推論
  - `options.align?: ('left'|'center'|'right')[]` — 各列のアラインメント、既定 left
- 戻り値: `string` — Markdown テーブル文字列
- 動作:
  - ヘッダ行: `| col1 | col2 |`
  - セパレータ行: `align` 未指定時は `| --- | --- |`。`align` 指定時は左 `:---` / 中央 `:---:` / 右 `---:` (既定 align は left だが、未指定時は素の `---`)
  - データ行: 各行を `| val1 | val2 |` 形式に
  - 値は `String(value)` で文字列化、null/undefinedは空文字、bigintも文字列化
  - Markdownエスケープ (q12確定): `|` → `\|`, 改行 `\n` → `<br>`
- エラー:
  - rows が配列でない → ValidationError
  - rows 要素が object でない → ValidationError
- 例:
  ```ts
  toMarkdownTable([{name:'a',age:1},{name:'b',age:2}])
  // | name | age |
  // | --- | --- |
  // | a | 1 |
  // | b | 2 |
  ```

### 5. formatNumber(value, options?) (q7,q9解決: bigint, ja-JP)

擬似シグネチャ:

```ts
type FormatNumberOptions = {
  locale?: string; // default 'ja-JP' (q9解決)
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  notation?: 'standard' | 'compact';
  compactDisplay?: 'short' | 'long';
};
function formatNumber(value: number | bigint, options?: FormatNumberOptions): string;
```

- 引数:
  - `value: number | bigint` — フォーマット対象、必須、NaNはValidationError。bigint対応(q7)
  - `options`: Intl.NumberFormat オプションのサブセット
- 戻り値: `string`
- 動作:
  - `Intl.NumberFormat` を使用、locale既定 `ja-JP` (q9確定)
  - bigintもフォーマット可能 (例: 1234567n → '1,234,567')
  - notation compactなら `1.2K` のような省略表記
- エラー:
  - valueが number|bigintでない、NaN → ValidationError
  - optionsが不正 → ValidationErrorまたは無視
- 例:
  ```ts
  formatNumber(1234567) // '1,234,567' (ja-JPでも同様)
  formatNumber(1234567n) // '1,234,567'
  formatNumber(1234.5, { maximumFractionDigits: 1 }) // '1,234.5'
  ```

### 6. formatTimestamp(value, options?) (q9解決: ja-JP)

擬似シグネチャ:

```ts
type FormatTimestampOptions = {
  locale?: string; // default 'ja-JP' (q9解決)
  timeZone?: string;
  format?: 'iso' | 'locale' | 'relative' | 'custom';
  customFormat?: string; // 将来拡張
};
function formatTimestamp(value: string | number | Date | bigint, options?: FormatTimestampOptions): string;
```

- 引数:
  - `value`: string(ISO8601), number(ms), Date, bigint(ms) (bigint は Number に変換して解釈)
  - `options.format`: 'iso'既定ならISO文字列、'locale'ならlocale文字列、'relative'なら相対時間 ('custom' は書式仕様が未定義のため未実装)
  - `options.locale`: 既定 `ja-JP` (q9確定)
- 戻り値: `string`
- 動作:
  - valueをDateにパース、失敗ならValidationError
  - format='iso' → `date.toISOString()`
  - format='locale' → `date.toLocaleString(locale, { timeZone })` locale既定 ja-JP
  - format='relative' → 現在時刻との差分を計算し、'X分前'等 (Intl.RelativeTimeFormat, locale ja-JP)
- エラー:
  - valueがパース不可能 → ValidationError
- 例:
  ```ts
  formatTimestamp('2024-01-01T00:00:00Z') // '2024-01-01T00:00:00.000Z'
  formatTimestamp(Date.now(), { format: 'relative', locale: 'ja-JP' }) // '今' (Intl.RelativeTimeFormat の出力)
  ```

### 7. paginate(items, page, pageSize) (q10解決: empty)

擬似シグネチャ:

```ts
type PaginateResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};
function paginate<T>(items: T[], page: number, pageSize: number): PaginateResult<T>;
```

- 引数:
  - `items: T[]` — 対象配列、必須
  - `page: number` — ページ番号、1-based、必須、1以上の整数
  - `pageSize: number` — 1ページあたり件数、必須、1以上の整数
- 戻り値: `PaginateResult<T>`
- 動作:
  - `totalItems = items.length`
  - `totalPages = Math.ceil(totalItems / pageSize)`
  - `start = (page - 1) * pageSize`
  - `end = start + pageSize`
  - `paginatedItems = items.slice(start, end)`
  - `hasNext = page < totalPages`
  - `hasPrev = page > 1`
  - page が totalPages を超える場合は空配列を返す (q10確定: empty、エラーにしない)
- エラー:
  - items が配列でない → ValidationError
  - page, pageSize が 1未満、NaN、非整数 → ValidationError
- 例:
  ```ts
  paginate([1,2,3,4,5], 1, 2) // { items: [1,2], page:1, pageSize:2, totalItems:5, totalPages:3, hasNext:true, hasPrev:false }
  paginate([1,2,3], 2, 2) // { items: [3], ... }
  paginate([1,2,3], 10, 2) // { items: [], page:10, ... } (q10確定)
  ```

### 8. getRecentStockHistory(history, limit) (q1,q7解決)

擬似シグネチャ:

```ts
function getRecentStockHistory(history: (number | bigint)[], limit?: number): (number | bigint)[];
// bigint対応版
function getRecentStockHistory(history: bigint[], limit?: number): bigint[];
```

- 引数:
  - `history: (number|bigint)[]` — StockEntry.prices相当、必須、bigint対応(q7)
  - `limit?: number` — 取得件数、optional、Stockのlimit規則と同じ
- 戻り値: `(number|bigint)[]` — 新しい順にソートされた配列
- 動作:
  - Stockのlimit規則を完全に再利用:
    - limit === undefined → 全件を新しい順に
    - limit === 0 → []
    - limit < 0 → ValidationError
    - NaNまたは整数でない → ValidationError
    - 正の整数 → history.slice(-limit).reverse() (末尾が最新確定 q1)
  - historyが配列でない、数値/bigint以外を含む → ValidationError
  - 純粋関数、副作用なし
- エラー: 上記規則通りValidationError
- 例:
  ```ts
  getRecentStockHistory([100,101,102,103], 2) // [103,102] (q1確定: 末尾が最新)
  getRecentStockHistory([100,101,102], 0) // []
  getRecentStockHistory([100,101,102]) // [102,101,100]
  getRecentStockHistory([100n,101n,102n], 2) // [102n,101n] (bigint対応)
  ```

## 共通バリデーション

- 全ヘルパーは引数バリデーションを行い、不正時は `TakasumiBotKitValidationError` を throw
- エラーの `field`, `value`, `code` を適切に設定

## 公開方法

- `src/helpers/index.ts` で各ヘルパーを export
- `src/index.ts` で `export * from './helpers'` または `export { truncate, ... }`
- `kit.helpers` 名前空間での提供も検討:
  ```ts
  kit.helpers.truncate(...)
  ```
  ただし tree-shaking のため named export を主とする

## テスト観点

- 各ヘルパーの正常系 (代表的な入力)
- 異常系 (不正引数で ValidationError)
- エッジケース (空配列、0、空文字、最大値)
- Stock history の limit 規則が `getRecentStockHistory` と `getStockHistoryById` で一致すること

