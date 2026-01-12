import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma/prisma";

import { SettingsClient } from "./_components/settings-client";

type PageProps = {
  params: Promise<{ termId: string }>;
  searchParams: Promise<{ section?: string }>;
};

export default async function TermSettingsPage({ 
  params,
  searchParams,
}: PageProps) {
  const { termId } = await params;
  const { section } = await searchParams;

  const term = await prisma.term.findUnique({
    where: { id: termId },
  });

  if (!term) {
    notFound();
  }

  // calendarDaysを取得（タイトル表示用）
  const calendarDays = await prisma.calendarDay.findMany({
    where: { termId },
    select: { date: true, title: true, dayType: true },
  });

  const subjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
  });

  const requiredLessonCounts = await prisma.requiredLessonCount.findMany({
    where: { termId },
    include: { subject: true },
  });

  const weeklyDayRules = await prisma.weeklyDayRule.findMany({
    where: { termId },
    orderBy: { weekday: "asc" },
  });

  const weekdaySlotCounts: Record<number, number> = {};
  for (const rule of weeklyDayRules) {
    weekdaySlotCounts[rule.weekday] = rule.defaultSlotCount;
  }

  const fixedTimetableSlots = await prisma.fixedTimetableSlot.findMany({
    where: { termId },
    include: { subject: true },
  });

  const actualTimetableSlots = await prisma.actualTimetableSlot.findMany({
    where: {
      termId,
      calendarDay: {
        dayType: { in: ["NORMAL", "SCHOOL_EVENT"] },
      },
      disabledReason: null,
    },
  });
  const totalAvailableSlots = actualTimetableSlots.length;

  // CalendarDayから各曜日の出現回数を計算
  const calendarDaysForOccurrences = await prisma.calendarDay.findMany({
    where: {
      termId,
      dayType: { in: ["NORMAL", "SCHOOL_EVENT"] },
    },
  });

  const weekdayOccurrences: Record<number, number> = {};
  for (const day of calendarDaysForOccurrences) {
    const jsWeekday = day.date.getUTCDay(); // 0=日, 1=月, ...
    if (jsWeekday >= 1 && jsWeekday <= 5) {
      weekdayOccurrences[jsWeekday] = (weekdayOccurrences[jsWeekday] ?? 0) + 1;
    }
  }

  // 各科目の授業消化数を計算
  const subjectCounts = new Map<string, number>();
  for (const slot of fixedTimetableSlots) {
    const occurrences = weekdayOccurrences[slot.weekday] ?? 0;
    const current = subjectCounts.get(slot.subjectId) ?? 0;
    subjectCounts.set(slot.subjectId, current + occurrences);
  }

  return (
    <main className="min-h-screen bg-muted/30 px-6 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/terms/${termId}`}>
              <ChevronLeftIcon className="h-5 w-5" />
              <span className="sr-only">学期ダッシュボードへ戻る</span>
            </Link>
          </Button>
          <div className="flex-1">
            <p className="text-muted-foreground text-sm">設定</p>
            <h1 className="text-2xl font-semibold tracking-tight">{term.name}</h1>
          </div>
        </div>

        <SettingsClient
          termId={termId}
          termStartsAtIso={term.startsAt.toISOString()}
          termEndsAtIso={term.endsAt.toISOString()}
          calendarDays={calendarDays.map((day) => ({
            date: day.date.toISOString(),
            title: day.title,
            dayType: day.dayType,
          }))}
          subjects={subjects}
          requiredLessonCounts={requiredLessonCounts.map((rlc) => ({
            subjectId: rlc.subjectId,
            subjectName: rlc.subject.name,
            requiredCount: rlc.requiredCount,
          }))}
          totalAvailableSlots={totalAvailableSlots}
          fixedTimetableSlots={fixedTimetableSlots}
          weekdaySlotCounts={weekdaySlotCounts}
          subjectCounts={Array.from(subjectCounts.entries()).map(
            ([subjectId, count]) => ({
              subjectId,
              count,
            })
          )}
          defaultOpenSection={section === "fixedTimetable" ? "fixedTimetable" : "calendar"}
        />
      </div>
    </main>
  );
}


