import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma/prisma";

import { RequirementsClient } from "./_components/requirements-client";

type PageProps = {
  params: Promise<{ termId: string }>;
};

export default async function RequirementsPage({ params }: PageProps) {
  const { termId } = await params;

  const term = await prisma.term.findUnique({
    where: { id: termId },
  });

  if (!term) {
    notFound();
  }

  // 既存の RequiredLessonCount から Subject を取得
  const requiredLessonCounts = await prisma.requiredLessonCount.findMany({
    where: { termId },
    include: {
      subject: true,
    },
  });

  // すべての Subject を取得
  const allSubjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
  });

  // DaySlot で disabledReason が null のもののみをカウント（実際に授業可能なコマ数）
  const daySlots = await prisma.daySlot.findMany({
    where: {
      calendarDay: {
        termId,
        dayType: {
          in: ["NORMAL", "SCHOOL_EVENT"],
        },
      },
      disabledReason: null,
    },
  });

  const totalAvailableSlots = daySlots.length;

  return (
    <main className="min-h-screen bg-muted/30 px-6 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/terms/${term.id}`}>
              <ChevronLeftIcon className="h-5 w-5" />
              <span className="sr-only">ダッシュボードへ戻る</span>
            </Link>
          </Button>
          <div className="flex-1">
            <p className="text-muted-foreground text-sm">法定の必要授業数</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {term.name}
            </h1>
          </div>
        </div>

        {allSubjects.length === 0 ? (
          <div className="rounded-lg border p-8 text-center">
            <p className="text-muted-foreground">
              科目が登録されていません。まず科目を登録してください。
            </p>
          </div>
        ) : (
          <RequirementsClient
            termId={term.id}
            subjects={allSubjects}
            requiredLessonCounts={requiredLessonCounts.map((rlc) => ({
              subjectId: rlc.subjectId,
              requiredCount: rlc.requiredCount,
            }))}
            totalAvailableSlots={totalAvailableSlots}
          />
        )}
      </div>
    </main>
  );
}

