import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma/prisma";

import { SettingsClient } from "./_components/settings-client";

type PageProps = {
  params: Promise<{ termId: string }>;
};

export default async function TermSettingsPage({ params }: PageProps) {
  const { termId } = await params;

  const term = await prisma.term.findUnique({
    where: { id: termId },
  });

  if (!term) {
    notFound();
  }

  const holidayDays = await prisma.calendarDay.findMany({
    where: { termId, dayType: "HOLIDAY" },
    orderBy: { date: "asc" },
    select: { date: true, title: true },
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

  const daySlots = await prisma.daySlot.findMany({
    where: {
      calendarDay: {
        termId,
        dayType: { in: ["NORMAL", "SCHOOL_EVENT"] },
      },
      disabledReason: null,
    },
  });
  const totalAvailableSlots = daySlots.length;

  // Timetables section: reuse the list + auto create UI
  const timetablePlansRaw = await prisma.timetablePlan.findMany({
    where: { termId },
    orderBy: { createdAt: "desc" },
    include: {
      timetablePlanSlots: {
        include: { subject: true },
      },
    },
  });

  const timetablePlans = timetablePlansRaw.map((plan) => ({
    id: plan.id,
    name: plan.name,
    createdAt: plan.createdAt,
    timetablePlanSlots: plan.timetablePlanSlots
      .filter(
        (
          slot
        ): slot is typeof slot & {
          subjectId: string;
          subject: NonNullable<typeof slot.subject>;
        } => slot.subjectId !== null && slot.subject !== null
      )
      .map((slot) => ({
        subjectId: slot.subjectId,
        subject: {
          id: slot.subject.id,
          name: slot.subject.name,
        },
      })),
  }));

  const planStats = timetablePlans.map((plan) => {
    const subjectCounts = new Map<string, number>();
    for (const slot of plan.timetablePlanSlots) {
      const current = subjectCounts.get(slot.subjectId) ?? 0;
      subjectCounts.set(slot.subjectId, current + 1);
    }
    return {
      planId: plan.id,
      subjectCounts: Array.from(subjectCounts.entries()).map(([subjectId, count]) => ({
        subjectId,
        count,
      })),
    };
  });

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
          holidays={holidayDays.map((holiday) => ({
            date: holiday.date.toISOString(),
            title: holiday.title ?? "祝日",
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
          timetablePlans={timetablePlans}
          planStats={planStats}
        />
      </div>
    </main>
  );
}


