import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma/prisma";

import { TimetablesClient } from "./_components/timetables-client";

type PageProps = {
  params: Promise<{ termId: string }>;
};

export default async function TimetablesPage({ params }: PageProps) {
  const { termId } = await params;

  const term = await prisma.term.findUnique({
    where: { id: termId },
  });

  if (!term) {
    notFound();
  }

  // 時間割プランを取得
  const timetablePlansRaw = await prisma.timetablePlan.findMany({
    where: { termId },
    orderBy: { createdAt: "desc" },
    include: {
      timetablePlanSlots: {
        include: {
          subject: true,
        },
      },
    },
  });

  // 型を変換（subjectIdとsubjectがnullでないものだけをフィルタ）
  const timetablePlans = timetablePlansRaw.map((plan) => ({
    id: plan.id,
    name: plan.name,
    createdAt: plan.createdAt,
    timetablePlanSlots: plan.timetablePlanSlots
      .filter(
        (slot): slot is typeof slot & { subjectId: string; subject: NonNullable<typeof slot.subject> } =>
          slot.subjectId !== null && slot.subject !== null
      )
      .map((slot) => ({
        subjectId: slot.subjectId,
        subject: {
          id: slot.subject.id,
          name: slot.subject.name,
        },
      })),
  }));

  // 科目ごとの必要授業数を取得
  const requiredLessonCounts = await prisma.requiredLessonCount.findMany({
    where: { termId },
    include: {
      subject: true,
    },
  });

  // 各時間割プランについて、科目ごとの授業消化数を計算
  const planStats = timetablePlans.map((plan) => {
    const subjectCounts = new Map<string, number>();
    for (const slot of plan.timetablePlanSlots) {
      const current = subjectCounts.get(slot.subjectId) ?? 0;
      subjectCounts.set(slot.subjectId, current + 1);
    }

    return {
      plan,
      subjectCounts: Array.from(subjectCounts.entries()).map(
        ([subjectId, count]) => ({
          subjectId,
          count,
        })
      ),
    };
  });

  return (
    <main className="min-h-screen bg-muted/30 px-6 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-sm">時間割の作成・管理</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {term.name}
            </h1>
          </div>
          <Button asChild variant="outline">
            <Link href={`/terms/${term.id}`}>ダッシュボードへ戻る</Link>
          </Button>
        </div>

        <TimetablesClient
          termId={term.id}
          timetablePlans={timetablePlans}
          requiredLessonCounts={requiredLessonCounts.map((rlc) => ({
            subjectId: rlc.subjectId,
            subjectName: rlc.subject.name,
            requiredCount: rlc.requiredCount,
          }))}
          planStats={planStats.map((stat) => ({
            planId: stat.plan.id,
            subjectCounts: stat.subjectCounts,
          }))}
        />
      </div>
    </main>
  );
}

