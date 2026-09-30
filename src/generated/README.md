# src/generated

`openapi-typescript` が生成する型定義の置き場所です。**手で編集しないでください。**

## 生成コマンド

```bash
npm run generate:types
# = openapi-typescript TakasumiBOT-OpenAPI-Document.json -o src/generated/openapi.ts
```

入力: リポジトリルートの `TakasumiBOT-OpenAPI-Document.json` (OpenAPI 3.0.3)
出力: `src/generated/openapi.ts`

## 使い方

```ts
import type { components } from "./openapi";

type RawGiftResponse = components["schemas"]["GiftResponse"];
```

生成型は `int64` を `number` として表現し、OpenAPI が `required` を宣言していないため
全プロパティが optional になります。そのため本 SDK は生成型を**直接公開しません**。

- 公開型は `src/schemas/*.ts` の zod スキーマから推論 (`z.infer`) したものを使う
- `int64` は `bigint`、`int32` は `number` として公開する
- 生成型は「キー集合が一致しているか」の型レベル回帰テスト
  (`tests/unit/schemas/openapiConsistency.test.ts`) と、path テンプレートの存在確認
  (`src/api/paths.ts` の `satisfies`) に利用する

## コミット方針

生成物はコミットします (レビュー容易性・CI での再生成確認のため)。

## WebSocket

`/v3/realtime/` は WS 操作であり HTTP メソッドを持たないため、生成型には含まれますが
本 SDK では一切利用しません。
