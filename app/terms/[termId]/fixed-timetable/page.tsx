import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma/prisma";

import { FixedTimetableClient } from "./_components/fixed-timetable-client";

type PageProps = {
  params: Promise<{ termId: string }>;
};

export default async function FixedTimetablePage({ params }: PageProps) {
  const { termId } = await params;

  const term = await prisma.term.findUnique({
    where: { id: termId },
  });

  if (!term) {
    notFound();
  }

  // 科目一覧を取得
  const subjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
  });

  // 固定時間割スロットを取得
  const fixedTimetableSlots = await prisma.fixedTimetableSlot.findMany({
    where: { termId },
    include: {
      subject: true,
    },
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
            <p className="text-muted-foreground text-sm">固定時間割</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {term.name}
            </h1>
          </div>
          <Button asChild variant="outline">
            <Link href={`/terms/${term.id}`}>ダッシュボードへ戻る</Link>
          </Button>
        </div>

        <FixedTimetableClient
          termId={term.id}
          subjects={subjects}
          fixedTimetableSlots={fixedTimetableSlots}
          weekdaySlotCounts={weekdaySlotCounts}
        />
      </div>
    </main>
  );
}
