import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma/prisma";

import { TimetableEditClient } from "./_components/timetable-edit-client";

type PageProps = {
  params: Promise<{ termId: string; timetableId: string }>;
};

export default async function TimetableEditPage({ params }: PageProps) {
  const { termId, timetableId } = await params;

  const term = await prisma.term.findUnique({
    where: { id: termId },
  });

  if (!term) {
    notFound();
  }

  const timetablePlan = await prisma.timetablePlan.findUnique({
    where: { id: timetableId },
    include: {
      timetablePlanSlots: {
        include: {
          subject: true,
        },
      },
    },
  });

  if (!timetablePlan || timetablePlan.termId !== termId) {
    notFound();
  }

  // 科目一覧を取得
  const subjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
  });

  // 週次ルールを取得して、各曜日の最大コマ数を計算
  const weeklyDayRules = await prisma.weeklyDayRule.findMany({
    where: { termId },
  });

  const weekdaySlotCounts: Record<number, number> = {};
  for (const rule of weeklyDayRules) {
    weekdaySlotCounts[rule.weekday] = rule.defaultSlotCount;
  }

  return (
    <main className="min-h-screen bg-muted/30 px-6 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-sm">時間割編集</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {timetablePlan.name}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/terms/${termId}/timetables`}>
                一覧に戻る
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/terms/${termId}`}>ダッシュボードへ戻る</Link>
            </Button>
          </div>
        </div>

        <TimetableEditClient
          timetablePlanId={timetablePlan.id}
          subjects={subjects}
          timetablePlanSlots={timetablePlan.timetablePlanSlots}
          weekdaySlotCounts={weekdaySlotCounts}
        />
      </div>
    </main>
  );
}

