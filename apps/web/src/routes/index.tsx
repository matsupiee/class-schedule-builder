import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-start gap-8 px-8 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">時間割作成</h1>
      <p className="text-muted-foreground">
        Cloudflare Workers + D1 + TanStack Start に移行中です。
      </p>
      <div className="flex flex-col gap-2">
        <a href="/terms" className="text-primary underline">
          学期へ
        </a>
        <a href="/subjects" className="text-primary underline">
          科目へ
        </a>
      </div>
    </main>
  );
}
