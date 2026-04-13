import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubjectUnitsClient } from "@/src/components/subjects/subject-units-client";
import { getSubjectWithUnits } from "@packages/api/actions/subject-units";

export const Route = createFileRoute("/subjects/$subjectId/units")({
  loader: async ({ params }) => {
    const subject = await getSubjectWithUnits({
      data: { subjectId: params.subjectId },
    });
    if (!subject) throw notFound();
    return subject;
  },
  component: SubjectUnitsPage,
});

function SubjectUnitsPage() {
  const subject = Route.useLoaderData();

  return (
    <main className="bg-muted/30 min-h-screen px-6 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-muted-foreground text-sm">
              <Link to="/subjects" className="hover:underline">
                科目一覧
              </Link>
              <span className="mx-2">/</span>
              <span>単元</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {subject.name}：単元管理
            </h1>
            <p className="text-muted-foreground text-sm">
              単元の追加・編集・削除・順番変更ができます。
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/subjects">科目一覧へ戻る</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>単元</CardTitle>
            <CardDescription>
              「コマ数」は、その単元を消化するのに必要な授業コマ数です。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SubjectUnitsClient
              subjectId={subject.id}
              subjectName={subject.name}
              initialUnits={subject.subjectUnits}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
