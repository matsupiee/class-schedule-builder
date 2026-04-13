import { createFileRoute, Link } from "@tanstack/react-router";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/_components/ui-parts/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/_components/ui-parts/table";
import { TermCreateDialog } from "@/routes/terms/_components/term-create-dialog";
import { listTerms } from "@packages/api/actions/terms";

export const Route = createFileRoute("/terms/")({
  loader: () => listTerms(),
  component: TermsPage,
});

function formatDate(iso: string) {
  const date = new Date(iso);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function calculateWeeks(startIso: string, endIso: string) {
  const msInDay = 24 * 60 * 60 * 1000;
  const days =
    Math.floor(
      (new Date(endIso).getTime() - new Date(startIso).getTime()) / msInDay,
    ) + 1;
  return Math.ceil(days / 7);
}

function TermsPage() {
  const terms = Route.useLoaderData();
  return (
    <main className="bg-muted/30 min-h-screen px-6 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">学期一覧</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              各学期の期間と授業週数を管理します。
            </p>
          </div>
          <TermCreateDialog />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>登録済みの学期</CardTitle>
            <CardDescription>学期の一覧と期間の確認。</CardDescription>
            <CardAction className="text-muted-foreground text-sm">
              {terms.length} 件
            </CardAction>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>学期名</TableHead>
                  <TableHead>開始日</TableHead>
                  <TableHead>終了日</TableHead>
                  <TableHead className="text-right">授業週数</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {terms.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className="text-muted-foreground text-center"
                      colSpan={4}
                    >
                      まだ学期が登録されていません。
                    </TableCell>
                  </TableRow>
                ) : (
                  terms.map((term) => (
                    <TableRow key={term.id} className="cursor-pointer">
                      <TableCell className="font-medium">
                        <Link
                          className="block w-full"
                          to="/terms/$termId"
                          params={{ termId: term.id }}
                        >
                          {term.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          className="block w-full"
                          to="/terms/$termId"
                          params={{ termId: term.id }}
                        >
                          {formatDate(term.startsAtIso)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          className="block w-full"
                          to="/terms/$termId"
                          params={{ termId: term.id }}
                        >
                          {formatDate(term.endsAtIso)}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          className="block w-full text-right"
                          to="/terms/$termId"
                          params={{ termId: term.id }}
                        >
                          {calculateWeeks(term.startsAtIso, term.endsAtIso)} 週
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
