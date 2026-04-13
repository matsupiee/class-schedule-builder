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
import { Button } from "@/shared/_components/ui-parts/button";
import { SubjectCreateDialog } from "@/shared/_components/subject-create-dialog";
import { listSubjects } from "@packages/api/actions/subjects";

export const Route = createFileRoute("/subjects/")({
  loader: () => listSubjects(),
  component: SubjectsPage,
});

function SubjectsPage() {
  const subjects = Route.useLoaderData();

  return (
    <main className="bg-muted/30 min-h-screen px-6 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">科目一覧</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              登録されている科目の一覧と管理。
            </p>
          </div>
          <SubjectCreateDialog />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>登録済みの科目</CardTitle>
            <CardDescription>科目の一覧と確認。</CardDescription>
            <CardAction className="text-muted-foreground text-sm">
              {subjects.length} 件
            </CardAction>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>科目名</TableHead>
                  <TableHead className="text-right">単元</TableHead>
                  <TableHead className="text-right">作成日</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className="text-muted-foreground text-center"
                      colSpan={3}
                    >
                      まだ科目が登録されていません。
                    </TableCell>
                  </TableRow>
                ) : (
                  subjects.map((subject) => (
                    <TableRow key={subject.id}>
                      <TableCell className="font-medium">
                        {subject.name}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link
                            to="/subjects/$subjectId/units"
                            params={{ subjectId: subject.id }}
                          >
                            単元管理（{subject.unitCount}）
                          </Link>
                        </Button>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right text-sm">
                        {new Date(subject.createdAtIso).toLocaleDateString(
                          "ja-JP",
                        )}
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
