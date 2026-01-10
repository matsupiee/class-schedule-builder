import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";

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

  // term中の各曜日の出現回数を計算
  // CalendarDayから、dayTypeがNORMALまたはSCHOOL_EVENTの日を取得
  const calendarDays = await prisma.calendarDay.findMany({
    where: {
      termId,
      dayType: {
        in: ["NORMAL", "SCHOOL_EVENT"],
      },
    },
    include: {
      daySlots: {
        where: {
          disabledReason: null,
        },
      },
    },
  });

  // 各曜日の出現回数をカウント（JavaScriptのgetUTCDay()で0=日、1=月...）
  const weekdayOccurrences: Record<number, number> = {};
  for (const day of calendarDays) {
    const jsWeekday = day.date.getUTCDay(); // 0=日, 1=月, 2=火, 3=水, 4=木, 5=金, 6=土
    // JavaScriptのweekdayをWeeklyDayRuleのweekdayに変換（1=月, 2=火, ...）
    if (jsWeekday >= 1 && jsWeekday <= 5) {
      weekdayOccurrences[jsWeekday] = (weekdayOccurrences[jsWeekday] ?? 0) + 1;
    }
  }

  // 法定の必要授業数を取得
  const requiredLessonCounts = await prisma.requiredLessonCount.findMany({
    where: { termId },
    include: {
      subject: true,
    },
  });

  return (
    <main className="min-h-screen bg-muted/30 px-6 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/terms/${termId}/timetables`}>
              <ChevronLeftIcon className="h-5 w-5" />
              <span className="sr-only">時間割一覧へ戻る</span>
            </Link>
          </Button>
          <div className="flex-1">
            <p className="text-muted-foreground text-sm">時間割編集</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {timetablePlan.name}
            </h1>
          </div>
        </div>

        <TimetableEditClient
          termId={termId}
          timetablePlanId={timetablePlan.id}
          subjects={subjects}
          timetablePlanSlots={timetablePlan.timetablePlanSlots}
          weekdaySlotCounts={weekdaySlotCounts}
          weekdayOccurrences={weekdayOccurrences}
          requiredLessonCounts={requiredLessonCounts.map((rlc) => ({
            subjectId: rlc.subjectId,
            subjectName: rlc.subject.name,
            requiredCount: rlc.requiredCount,
          }))}
        />
      </div>
    </main>
  );
}


