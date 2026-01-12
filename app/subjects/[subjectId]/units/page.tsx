import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma/prisma";

import { SubjectUnitsClient } from "./_components/subject-units-client";

type PageProps = {
  params: Promise<{ subjectId: string }>;
};

export default async function SubjectUnitsPage({ params }: PageProps) {
  const { subjectId } = await params;

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: {
      id: true,
      name: true,
      subjectUnits: {
        select: {
          id: true,
          unitName: true,
          slotCount: true,
          order: true,
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!subject) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-muted/30 px-6 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-muted-foreground text-sm">
              <Link href="/subjects" className="hover:underline">
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
            <Link href="/subjects">科目一覧へ戻る</Link>
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

