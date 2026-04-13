# ディレクトリ構成ルール（apps/web）

Next.js App Router / TanStack Start を採用するフロントエンド（`apps/web`）のディレクトリ構成ルール。新規ファイルを追加するとき・既存ファイルを移動するときは **必ずこのルールに従うこと**。

## 基本方針：co-location & package by feature

- **co-location**: 同じものは同じ場所に置く
- **package by feature**: レイヤー（`components/`, `hooks/`, `utils/` を横断する構造）ではなく、**機能まとまり（feature）** 単位でまとめる

> レイヤー構造は関連ファイルがリポジトリ全体に散らばり、1ページ分の実装を把握するのにも大量のディレクトリを横断する必要が出る。co-location にすることで、1機能の変更範囲がそのディレクトリ内に閉じる。

### 判断フロー（新規ファイルをどこに置くか）

```
新規ファイルを作るとき
  │
  ├─ 1ページだけで使う？
  │     → そのページディレクトリ内の _components / _hooks / _utils に置く
  │
  ├─ 同じ機能まとまり（feature）内の複数ページで使う？
  │     → その feature 直下の _components / _hooks / _utils に置く
  │
  ├─ 複数の feature をまたいで使う？
  │     → shared/_components などに置く
  │
  └─ 外部ライブラリのラッパー・設定？
        → libs/<library-name>/ に置く
```

**ルール**: 最初は一番近い場所（ページ直下）に置く。後から「他の場所でも使いたい」となったときに初めて、feature 直下 → shared と段階的に引き上げる。最初から shared に置かない。

## ディレクトリ構成テンプレート

```
apps/web/src/
├── app/                              # Next.js App Router (または TanStack Start の routes/)
│   ├── (authenticated)/              # 認証済みユーザー向けレイアウトグループ
│   │   ├── _components/              # 認証済みレイアウト配下で shared なコンポーネント
│   │   │   ├── sidebar.tsx
│   │   │   └── page-header.tsx
│   │   │
│   │   ├── terms/                    # feature: 学期 / 時間割
│   │   │   ├── _components/          # terms feature 内で shared
│   │   │   ├── _hooks/
│   │   │   ├── _utils/               # zod schema / 純粋関数など
│   │   │   │
│   │   │   ├── (list)/
│   │   │   │   ├── _components/      # list ページ専用
│   │   │   │   ├── _hooks/
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── (detail)/[id]/
│   │   │   │   ├── _components/
│   │   │   │   ├── _hooks/
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   └── (form)/
│   │   │       ├── 1/                # form 1 ページ目の情報はここだけ見れば OK
│   │   │       │   ├── _components/
│   │   │       │   ├── _hooks/
│   │   │       │   ├── _utils/
│   │   │       │   └── page.tsx
│   │   │       ├── 2/                # form 2 ページ目も同様
│   │   │       │   ├── _components/
│   │   │       │   ├── _hooks/
│   │   │       │   ├── _utils/
│   │   │       │   └── page.tsx
│   │   │       └── 3/
│   │   │           └── ...
│   │   │
│   │   ├── subjects/                 # feature: 科目
│   │   │   ├── _components/
│   │   │   ├── _hooks/
│   │   │   └── page.tsx
│   │   │
│   │   └── layout.tsx                # サイドバー・ヘッダーなど共通 UI
│   │
│   ├── (unauthenticated)/            # 未認証ユーザー向けレイアウトグループ
│   │   ├── sign-in/page.tsx
│   │   ├── sign-up/
│   │   │   ├── _utils/
│   │   │   └── page.tsx
│   │   └── password/forgot/page.tsx
│   │
│   ├── layout.tsx                    # ルートレイアウト
│   └── globals.css
│
├── libs/                             # 外部ライブラリのラッパー・統合処理
│   ├── auth/                         # 認証ライブラリ（Firebase Auth / Clerk など）
│   ├── shadcn/                       # shadcn/ui の設定・utils
│   └── <library-name>/
│
├── shared/                           # 複数 feature をまたいで使う処理
│   ├── _components/
│   │   └── ui-parts/                 # shadcn/ui の primitive コンポーネント
│   │       ├── button.tsx
│   │       └── dialog.tsx
│   ├── _hooks/
│   │   ├── use-cursor-pagination.ts
│   │   └── use-window-size.ts
│   └── _utils/
│       ├── date-utils.ts
│       └── csv.ts
│
└── proxy.ts                          # 認証・認可ミドルウェア
```

## 各ルールの詳細

### 1. プライベートフォルダ（`_xxx/`）

- 先頭にアンダースコアが付いたフォルダは **Next.js のルーティング対象外**（private folders）
- TanStack Start でも同様に、ルーティング対象にならないように `_` プレフィックスを使う
- 視覚的にも「これは route ではなく、co-located なコード」と判別しやすい
- `_components/`, `_hooks/`, `_utils/` を使い、`components/`, `hooks/`, `utils/` のようにアンダースコアなしの名前を route 配下で使わない

参考: https://nextjs.org/docs/app/getting-started/project-structure#route-groups-and-private-folders

### 2. ルートグループ（`(xxx)/`）

- 丸括弧で囲ったフォルダは URL に現れない group
- 用途:
  - **認証状態の分離**: `(authenticated)/`, `(unauthenticated)/`
  - **ページ種別の分類**: `(list)/`, `(detail)/`, `(form)/`
- 認証チェックは `(authenticated)/layout.tsx` にまとめて、各ページコンポーネントが認証の仕組みを意識しなくて済むようにする

### 3. feature ディレクトリ

- 1つの機能まとまり = 1つの feature ディレクトリ（`terms/`, `subjects/`, `favorites/` など）
- feature 内部で複数ページが shared するものは、feature 直下の `_components/`, `_hooks/`, `_utils/` に置く
- **feature をまたぐ依存は shared/ 経由でのみ許可**。feature 間の直接 import（`terms/_utils` を `subjects/` から import するなど）は禁止

### 4. `shared/` の使い方

- `shared/` は「複数 feature で実際に使われているもの」だけを置く場所
- 新規ファイルを最初から shared に置かない。最初はページや feature に閉じた場所に置き、2つ目の利用箇所が出てきた時点で引き上げる
- shared に置いたものは影響範囲が広い。変更時は「複数 feature への影響」を意識する

### 5. `libs/` の使い方

- **外部ライブラリのラップ処理・統合処理専用**。ビジネスロジックは置かない
- 例: Firebase Auth の初期化、shadcn/ui の `cn()` ユーティリティ、API クライアントの instantiation
- libs 配下は「このプロジェクトの外の世界との境界面」。libs の中は外部ライブラリの都合に合わせた書き方でよいが、libs の外はプロジェクト固有の命名に揃える

### 6. 置き場所に迷ったときの単純ルール

> 「複数の機能まとまりで使われたら shared に置く」それ以外はページ／feature に閉じる

このルールだけでほぼ全ての判断ができる。迷ったら **より狭いスコープ**（ページ直下 > feature 直下 > shared）を選ぶ。

## 禁止事項

- ❌ `src/components/`, `src/hooks/`, `src/utils/` のようなレイヤー構造のトップレベルディレクトリ（`shared/_components` などの co-located な構造を使う）
- ❌ feature ディレクトリをまたぐ直接 import（`terms/` から `subjects/_utils/` を import するなど）
- ❌ 最初から shared に置く（YAGNI：本当に複数箇所で使われてから引き上げる）
- ❌ libs/ にビジネスロジックを書く（libs はあくまで外部ライブラリの境界面）
- ❌ route 配下で `_` なしの `components/`, `hooks/`, `utils/` という名前を使う

## 参考

- [Next.js - Private folders](https://nextjs.org/docs/app/getting-started/project-structure#route-groups-and-private-folders)
- [レバテック - package by feature](https://levtech.jp/media/article/column/detail_721/)
- [Zenn - レイヤー分離の問題点](https://zenn.dev/misuken/articles/bdd33790ed4cd0)
