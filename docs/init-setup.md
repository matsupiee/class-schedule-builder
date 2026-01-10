1. tanstack-start で schadcn プロジェクトを作成

```
pnpm create @tanstack/start@latest --tailwind --add-ons shadcn

# アプリ名は`app`とする

# ディレクトリを移動
mv class-schedule-builder/* .
```

2. コンポーネントをプロジェクトに追加

```
pnpm dlx shadcn@latest init
```

[参照]
https://ui.shadcn.com/docs/installation/tanstack

3. prisma

https://www.prisma.io/docs/getting-started/prisma-orm/quickstart/postgresql

```
pnpm add prisma @types/node @types/pg --save-dev
pnpm add @prisma/client @prisma/adapter-pg pg dotenv
```

prisma.config.ts と prismalintrc.json を作成
