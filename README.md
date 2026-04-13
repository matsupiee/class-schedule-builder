# class-schedule-builder

TanStack Start + Prisma + Cloudflare Workers (D1) で動く時間割作成アプリ。

## スタック

- **ルーティング/SSR**: TanStack Start (Vite + TanStack Router file-based routing)
- **ORM**: Prisma 7 (`prisma-client` 生成 + `@prisma/adapter-d1`)
- **DB**: Cloudflare D1 (SQLite)
- **デプロイ**: Cloudflare Workers (`@cloudflare/vite-plugin` + `wrangler deploy`)
- **UI**: shadcn/ui + Tailwind CSS v4

## 初期セットアップ

```bash
mise trust              # 同梱の .mise.toml で node/pnpm のバージョンを固定
pnpm install
pnpm prisma:generate    # Prisma クライアント (workerd ランタイム) を生成
pnpm db:apply:local     # 既存マイグレーションをローカル D1 に適用
```

## 開発フロー

`@cloudflare/vite-plugin` 経由で Workers ランタイムをエミュレートしているため、
ローカル D1 を使った開発は次の流れになります。

```bash
pnpm build              # vite build → dist/server/index.js + dist/server/wrangler.json
npx wrangler dev --local --persist-to .wrangler/state -c dist/server/wrangler.json
```

> 注: 現状は TanStack Start の仮想モジュールが Cloudflare Vite プラグインの dep optimizer と
> 相性が悪く、`vite dev` 単独では起動できません。上記の `build → wrangler dev` フローを使ってください。

## D1 マイグレーション

Prisma スキーマから `prisma migrate diff` で SQL を生成し、Wrangler で D1 に流し込む二段構えです。

```bash
# 新しいマイグレーション SQL を生成
pnpm db:migrate:new
# → lib/prisma/migrations/<timestamp>_init.sql が作成される

# ローカル D1 に適用
pnpm db:apply:local

# 本番 D1 に適用 (事前に wrangler.toml の database_id を実 ID に置き換えること)
pnpm db:apply:remote
```

## デプロイ

1. `wrangler.toml` の `database_id` をリモート D1 の実 ID に置き換える
2. `pnpm deploy`

```bash
pnpm run deploy             # vite build → wrangler deploy
```

## ディレクトリ構成

```
src/
├── routes/                 # ファイルベースの TanStack Router ルート
│   ├── __root.tsx
│   ├── index.tsx
│   ├── subjects/
│   └── terms/
├── components/             # ルートごとに分割したクライアント React コンポーネント
├── server.ts               # Cloudflare Workers エントリ (env を AsyncLocalStorage に積む)
├── router.tsx              # TanStack Router の生成
└── styles/app.css          # Tailwind v4 + テーマ変数

lib/
├── prisma/
│   ├── schema.prisma       # SQLite 用スキーマ (provider = "sqlite")
│   ├── prisma.ts           # createPrismaClient(d1) ファクトリ
│   └── migrations/         # wrangler d1 で適用する SQL
└── server/
    ├── cloudflare-context.ts  # AsyncLocalStorage で env をリクエスト境界に保持
    ├── db.ts                  # getDb() : リクエストから D1 → Prisma を取り出す
    └── actions/               # createServerFn 群 (RPC エンドポイント)

components/                 # shadcn/ui コンポーネント (共通)
hooks/                      # 共通フック
```
