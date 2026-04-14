# テストルール

フロントエンド（`apps/web`）とバックエンド（`packages/api`）のテストに関するルール。

## 基本方針：全ページの挙動にテストを書く

`apps/web` に新しいページ（`src/routes/` 配下の route ファイル）を追加するとき、**必ずそのページの挙動についての統合テストを書くこと**。既存ページを変更するときも、対象のテストを読み、挙動の変化をテストに反映すること。

> ページはユーザーが触れるアプリケーションの境界面。ここが壊れたままデプロイされるとユーザーに直接影響する。ページ単位のテストは、loader の返り値 → 画面描画 → 主要な UI 要素・リンク、の最低限の契約を保証する「落ちたら直すべき」安全網として機能させる。

### 何をテストするか

1ページにつき、少なくとも以下をカバーする:

1. **空状態 / 初期状態** — loader が空配列や未設定データを返したときに、空状態メッセージが表示されること
2. **通常状態** — loader が典型的なデータを返したときに、期待される要素（見出し、件数、テーブル行、カード等）が表示されること
3. **分岐 UI** — 条件によって UI が切り替わる箇所（「設定済み / 未設定」「件数による分岐」「search params による分岐」など）それぞれ
4. **リンク / 導線** — 他ページへのリンクの `href` が正しいこと（パラメータの埋め込みを含む）
5. **エラー / notFound** — loader が `notFound()` を投げるケースが UI としてハンドルされる場合、その挙動

> 「通ったら OK」ではなく **「期待していない UI になっていたら落ちる」** ことがテストの価値。空状態と通常状態の両方を必ずカバーすることで、「データが空でも壊れる / 通常データでも壊れる」の両方を検出できるようにする。

### テストの置き場所

- **co-location**: ページと同じディレクトリに `xxx.test.tsx` として置く（例: `src/routes/terms/index.tsx` に対して `src/routes/terms/index.test.tsx`）
- ディレクトリ構成ルール（[directory-structure.md](./directory-structure.md)）の co-location 方針に従う
- `vite.config.ts` の `routeFileIgnorePattern` で `.test.` を除外済み。テストファイルは route として扱われない

### ツール・セットアップ

- **ランナー**: Vitest（`pnpm --filter @packages/web test`）
- **DOM**: jsdom
- **アサーション**: `@testing-library/react` + `@testing-library/jest-dom`
- **ユーザー操作**: `@testing-library/user-event`
- **ルータ mock**: `src/test/route-mocks.tsx` — `@tanstack/react-router` の `createFileRoute` / `Link` / `useRouter` などを stub 化
- **render helper**: `src/test/render-route.tsx` の `renderRoute(Route, { loaderData, search, params })` を使う

### テンプレート

```tsx
import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";

// server function は単体テストの境界として mock する
vi.mock("@packages/api/actions/<module>", () => ({
  <action>: vi.fn(),
}));

import { renderRoute } from "@/test/render-route";
import { Route } from "./<page>";

describe("<PageName>", () => {
  it("空状態のメッセージを表示する", () => {
    renderRoute(Route, { loaderData: [] });
    expect(screen.getByText("...")).toBeInTheDocument();
  });

  it("通常データで期待要素を表示する", () => {
    renderRoute(Route, { loaderData: [/* ... */] });
    expect(screen.getByRole("heading", { name: "..." })).toBeInTheDocument();
  });
});
```

### 何をテストしないか（やりすぎない）

- **shadcn/ui の primitive コンポーネントそのもの** — すでにライブラリ側でテストされている。ページ側で primitive を直接テストしない
- **スタイル（クラス名）のスナップショット** — 変更に弱く、落ちても何も気付けない。ロール・テキスト・`href` など振る舞いに根ざしたアサーションを使う
- **server function の中身** — `packages/api` 側の unit/integration test でカバーする。ページテストでは server function を mock する
- **サブコンポーネントを深く辿った末端の挙動** — 深い子コンポーネントにロジックがあるなら、その子コンポーネントに対するテストを別途書く。ページテストはあくまでページの契約を守るためのもの

## バックエンド（`packages/api`）

- `packages/api/test/` に Vitest + miniflare（D1 :memory:）でアクション単位の integration test を書く
- 新しい action（`src/actions/*.ts`）を追加するときは、対応する test を同時に書くこと
- 既存パターンは `packages/api/test/terms.test.ts` 参照

## 実行

```bash
# フロントエンド
pnpm --filter @packages/web test

# バックエンド
pnpm --filter @packages/api test

# 両方
pnpm -r test
```
