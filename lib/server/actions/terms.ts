import { createServerFn } from "@tanstack/react-start";
import * as holidayJp from "@holiday-jp/holiday_jp";
import { getDb } from "@/lib/server/db";

const MS_IN_DAY = 24 * 60 * 60 * 1000;

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function normalizeToUtcDate(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function buildCalendarDays(
  termId: string,
  startsAt: Date,
  endsAt: Date,
  weekdaySlotCounts: Record<number, number>,
) {
  const startDate = normalizeToUtcDate(startsAt);
  const endDate = normalizeToUtcDate(endsAt);
  const holidays = holidayJp.between(startDate, endDate);
  const holidayMap = new Map(
    holidays.map((h) => [toDateKey(h.date), h.name]),
  );

  const days: Array<{
    termId: string;
    date: Date;
    dayType: "NORMAL" | "WEEKLY_OFF" | "HOLIDAY" | "SCHOOL_EVENT";
    slotCount: number;
    title: string | null;
  }> = [];
  for (
    let current = new Date(startDate);
    current.getTime() <= endDate.getTime();
    current = new Date(current.getTime() + MS_IN_DAY)
  ) {
    const dayKey = toDateKey(current);
    const holidayName = holidayMap.get(dayKey);
    const jsWeekday = current.getUTCDay();
    const isWeekend = jsWeekday === 0 || jsWeekday === 6;
    const weekdayRule = jsWeekday >= 1 && jsWeekday <= 5 ? jsWeekday : null;
    let dayType: "NORMAL" | "WEEKLY_OFF" | "HOLIDAY" | "SCHOOL_EVENT" =
      "NORMAL";
    let slotCount =
      weekdayRule !== null ? (weekdaySlotCounts[weekdayRule] ?? 6) : 0;
    let title: string | null = null;
    if (holidayName) {
      dayType = "HOLIDAY";
      slotCount = 0;
      title = holidayName;
    } else if (isWeekend) {
      dayType = "WEEKLY_OFF";
      slotCount = 0;
    }
    days.push({ termId, date: new Date(current), dayType, slotCount, title });
  }
  return days;
}

export const listTerms = createServerFn({ method: "GET" }).handler(async () => {
  const db = getDb();
  const terms = await db.term.findMany({ orderBy: { startsAt: "asc" } });
  return terms.map((t) => ({
    id: t.id,
    name: t.name,
    startsAtIso: t.startsAt.toISOString(),
    endsAtIso: t.endsAt.toISOString(),
  }));
});

export const createTerm = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      name: string;
      startsAt: string;
      endsAt: string;
      defaultSlotCounts: Record<string, number>;
    }) => {
      const name = String(data?.name ?? "").trim();
      const startsAtRaw = String(data?.startsAt ?? "");
      const endsAtRaw = String(data?.endsAt ?? "");
      if (!name || !startsAtRaw || !endsAtRaw) {
        throw new Error("入力内容を確認してください。");
      }
      const startsAt = new Date(startsAtRaw);
      const endsAt = new Date(endsAtRaw);
      if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
        throw new Error("日付の形式が正しくありません。");
      }
      if (endsAt < startsAt) {
        throw new Error("終了日は開始日以降にしてください。");
      }
      const counts: Record<number, number> = {};
      for (const weekday of [1, 2, 3, 4, 5]) {
        const value = Number(data?.defaultSlotCounts?.[String(weekday)]);
        if (!Number.isInteger(value) || value <= 0) {
          throw new Error("コマ数は1以上で入力してください。");
        }
        counts[weekday] = value;
      }
      return { name, startsAt, endsAt, counts };
    },
  )
  .handler(async ({ data }) => {
    const db = getDb();
    await db.$transaction(async (tx) => {
      const term = await tx.term.create({
        data: { name: data.name, startsAt: data.startsAt, endsAt: data.endsAt },
      });
      await tx.weeklyDayRule.createMany({
        data: [1, 2, 3, 4, 5].map((weekday) => ({
          termId: term.id,
          weekday,
          defaultSlotCount: data.counts[weekday],
        })),
      });
      const calendarDays = buildCalendarDays(
        term.id,
        data.startsAt,
        data.endsAt,
        data.counts,
      );
      for (const calendarDay of calendarDays) {
        const created = await tx.calendarDay.create({ data: calendarDay });
        if (calendarDay.slotCount > 0) {
          await tx.actualTimetableSlot.createMany({
            data: Array.from({ length: calendarDay.slotCount }, (_, index) => ({
              termId: term.id,
              calendarDayId: created.id,
              daySlotIndex: index + 1,
              disabledReason: null,
              subjectId: null,
              subjectUnitId: null,
              unitSlotIndex: null,
            })),
          });
        }
      }
    });
  });

export const getTermDashboard = createServerFn({ method: "GET" })
  .inputValidator((data: { termId: string }) => {
    const termId = String(data?.termId ?? "");
    if (!termId) throw new Error("termId is required");
    return { termId };
  })
  .handler(async ({ data }) => {
    const db = getDb();
    const term = await db.term.findUnique({ where: { id: data.termId } });
    if (!term) return null;
    const [
      calendarDaysCount,
      requiredLessonCountsCount,
      fixedTimetableSlotsCount,
      fixedTimetableSlots,
      weeklyDayRules,
      calendarDays,
      requiredLessonCounts,
    ] = await Promise.all([
      db.calendarDay.count({ where: { termId: data.termId } }),
      db.requiredLessonCount.count({ where: { termId: data.termId } }),
      db.fixedTimetableSlot.count({ where: { termId: data.termId } }),
      db.fixedTimetableSlot.findMany({
        where: { termId: data.termId },
        include: { subject: true },
      }),
      db.weeklyDayRule.findMany({ where: { termId: data.termId } }),
      db.calendarDay.findMany({
        where: {
          termId: data.termId,
          dayType: { in: ["NORMAL", "SCHOOL_EVENT"] },
        },
      }),
      db.requiredLessonCount.findMany({
        where: { termId: data.termId },
        include: { subject: true },
      }),
    ]);
    const weekdaySlotCounts: Record<number, number> = {};
    for (const rule of weeklyDayRules) {
      weekdaySlotCounts[rule.weekday] = rule.defaultSlotCount;
    }
    const weekdayOccurrences: Record<number, number> = {};
    for (const day of calendarDays) {
      const jsWeekday = day.date.getUTCDay();
      if (jsWeekday >= 1 && jsWeekday <= 5) {
        weekdayOccurrences[jsWeekday] = (weekdayOccurrences[jsWeekday] ?? 0) + 1;
      }
    }
    const subjectCounts = new Map<string, number>();
    for (const slot of fixedTimetableSlots) {
      const occ = weekdayOccurrences[slot.weekday] ?? 0;
      subjectCounts.set(
        slot.subjectId,
        (subjectCounts.get(slot.subjectId) ?? 0) + occ,
      );
    }
    return {
      term: {
        id: term.id,
        name: term.name,
        startsAtIso: term.startsAt.toISOString(),
        endsAtIso: term.endsAt.toISOString(),
      },
      calendarDaysCount,
      requiredLessonCountsCount,
      fixedTimetableSlotsCount,
      fixedTimetableSlots: fixedTimetableSlots.map((s) => ({
        weekday: s.weekday,
        daySlotIndex: s.daySlotIndex,
        subjectId: s.subjectId,
        subject: { id: s.subject.id, name: s.subject.name },
        name: s.name,
        note: s.note,
      })),
      weekdaySlotCounts,
      requiredLessonCounts: requiredLessonCounts.map((rlc) => ({
        subjectId: rlc.subjectId,
        subjectName: rlc.subject.name,
        requiredCount: rlc.requiredCount,
      })),
      subjectCounts: Array.from(subjectCounts.entries()).map(
        ([subjectId, count]) => ({ subjectId, count }),
      ),
    };
  });

export const getTermSettings = createServerFn({ method: "GET" })
  .inputValidator((data: { termId: string }) => {
    const termId = String(data?.termId ?? "");
    if (!termId) throw new Error("termId is required");
    return { termId };
  })
  .handler(async ({ data }) => {
    const db = getDb();
    const term = await db.term.findUnique({ where: { id: data.termId } });
    if (!term) return null;
    const [
      calendarDays,
      subjects,
      requiredLessonCounts,
      weeklyDayRules,
      fixedTimetableSlots,
      actualTimetableSlots,
      calendarDaysForOcc,
    ] = await Promise.all([
      db.calendarDay.findMany({
        where: { termId: data.termId },
        select: { date: true, title: true, dayType: true },
      }),
      db.subject.findMany({ orderBy: { name: "asc" } }),
      db.requiredLessonCount.findMany({
        where: { termId: data.termId },
        include: { subject: true },
      }),
      db.weeklyDayRule.findMany({
        where: { termId: data.termId },
        orderBy: { weekday: "asc" },
      }),
      db.fixedTimetableSlot.findMany({
        where: { termId: data.termId },
        include: { subject: true },
      }),
      db.actualTimetableSlot.findMany({
        where: {
          termId: data.termId,
          calendarDay: { dayType: { in: ["NORMAL", "SCHOOL_EVENT"] } },
          disabledReason: null,
        },
      }),
      db.calendarDay.findMany({
        where: {
          termId: data.termId,
          dayType: { in: ["NORMAL", "SCHOOL_EVENT"] },
        },
      }),
    ]);
    const weekdaySlotCounts: Record<number, number> = {};
    for (const rule of weeklyDayRules) {
      weekdaySlotCounts[rule.weekday] = rule.defaultSlotCount;
    }
    const weekdayOccurrences: Record<number, number> = {};
    for (const day of calendarDaysForOcc) {
      const jsWeekday = day.date.getUTCDay();
      if (jsWeekday >= 1 && jsWeekday <= 5) {
        weekdayOccurrences[jsWeekday] = (weekdayOccurrences[jsWeekday] ?? 0) + 1;
      }
    }
    const subjectCounts = new Map<string, number>();
    for (const slot of fixedTimetableSlots) {
      const occ = weekdayOccurrences[slot.weekday] ?? 0;
      subjectCounts.set(
        slot.subjectId,
        (subjectCounts.get(slot.subjectId) ?? 0) + occ,
      );
    }
    return {
      term: {
        id: term.id,
        name: term.name,
        startsAtIso: term.startsAt.toISOString(),
        endsAtIso: term.endsAt.toISOString(),
      },
      calendarDays: calendarDays.map((d) => ({
        date: d.date.toISOString(),
        title: d.title,
        dayType: d.dayType,
      })),
      subjects: subjects.map((s) => ({ id: s.id, name: s.name })),
      requiredLessonCounts: requiredLessonCounts.map((rlc) => ({
        subjectId: rlc.subjectId,
        subjectName: rlc.subject.name,
        requiredCount: rlc.requiredCount,
      })),
      totalAvailableSlots: actualTimetableSlots.length,
      fixedTimetableSlots: fixedTimetableSlots.map((s) => ({
        weekday: s.weekday,
        daySlotIndex: s.daySlotIndex,
        subjectId: s.subjectId,
        subject: { id: s.subject.id, name: s.subject.name },
        name: s.name,
        note: s.note,
      })),
      weekdaySlotCounts,
      subjectCounts: Array.from(subjectCounts.entries()).map(
        ([subjectId, count]) => ({ subjectId, count }),
      ),
    };
  });
