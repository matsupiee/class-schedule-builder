import { createServerFn } from "@tanstack/react-start";
import { getDb } from "@/lib/server/db";

export const saveFixedTimetableSlot = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      termId: string;
      weekday: number;
      daySlotIndex: number;
      subjectId: string;
      name: string;
      note: string;
    }) => {
      const termId = String(data?.termId ?? "");
      const weekday = Number(data?.weekday ?? 0);
      const daySlotIndex = Number(data?.daySlotIndex ?? 0);
      const subjectId = String(data?.subjectId ?? "");
      const name = String(data?.name ?? "").trim() || null;
      const note = String(data?.note ?? "").trim() || null;
      if (!termId || !subjectId) throw new Error("termId, subjectId required");
      if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) {
        throw new Error("invalid weekday");
      }
      if (!Number.isInteger(daySlotIndex) || daySlotIndex < 1) {
        throw new Error("invalid daySlotIndex");
      }
      return { termId, weekday, daySlotIndex, subjectId, name, note };
    },
  )
  .handler(async ({ data }) => {
    const db = getDb();
    await db.fixedTimetableSlot.upsert({
      where: {
        termId_weekday_daySlotIndex: {
          termId: data.termId,
          weekday: data.weekday,
          daySlotIndex: data.daySlotIndex,
        },
      },
      update: { subjectId: data.subjectId, name: data.name, note: data.note },
      create: {
        termId: data.termId,
        weekday: data.weekday,
        daySlotIndex: data.daySlotIndex,
        subjectId: data.subjectId,
        name: data.name,
        note: data.note,
      },
    });
  });

export const deleteFixedTimetableSlot = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { termId: string; weekday: number; daySlotIndex: number }) => {
      const termId = String(data?.termId ?? "");
      const weekday = Number(data?.weekday ?? 0);
      const daySlotIndex = Number(data?.daySlotIndex ?? 0);
      if (!termId) throw new Error("termId required");
      if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) {
        throw new Error("invalid weekday");
      }
      if (!Number.isInteger(daySlotIndex) || daySlotIndex < 1) {
        throw new Error("invalid daySlotIndex");
      }
      return { termId, weekday, daySlotIndex };
    },
  )
  .handler(async ({ data }) => {
    const db = getDb();
    await db.fixedTimetableSlot.delete({
      where: {
        termId_weekday_daySlotIndex: {
          termId: data.termId,
          weekday: data.weekday,
          daySlotIndex: data.daySlotIndex,
        },
      },
    });
  });

export const autoGenerateFixedTimetable = createServerFn({ method: "POST" })
  .inputValidator((data: { termId: string }) => {
    const termId = String(data?.termId ?? "");
    if (!termId) throw new Error("学期IDが指定されていません。");
    return { termId };
  })
  .handler(async ({ data }) => {
    const db = getDb();
    const requiredLessonCounts = await db.requiredLessonCount.findMany({
      where: { termId: data.termId },
    });
    if (requiredLessonCounts.length === 0) {
      throw new Error("法定の必要授業数が設定されていません。");
    }
    const weeklyDayRules = await db.weeklyDayRule.findMany({
      where: { termId: data.termId },
      orderBy: { weekday: "asc" },
    });
    if (weeklyDayRules.length === 0) {
      throw new Error("週次ルールが設定されていません。");
    }
    const calendarDays = await db.calendarDay.findMany({
      where: {
        termId: data.termId,
        dayType: { in: ["NORMAL", "SCHOOL_EVENT"] },
      },
    });
    const weekdayOccurrences: Record<number, number> = {};
    for (const day of calendarDays) {
      const jsWeekday = day.date.getUTCDay();
      if (jsWeekday >= 1 && jsWeekday <= 5) {
        weekdayOccurrences[jsWeekday] = (weekdayOccurrences[jsWeekday] ?? 0) + 1;
      }
    }
    let totalOccurrences = 0;
    for (const rule of weeklyDayRules) {
      totalOccurrences += weekdayOccurrences[rule.weekday] ?? 0;
    }
    const subjectWeekdayRequirements = new Map<string, Map<number, number>>();
    for (const rlc of requiredLessonCounts) {
      const weekdayMap = new Map<number, number>();
      for (const rule of weeklyDayRules) {
        const weekday = rule.weekday;
        const occurrences = weekdayOccurrences[weekday] ?? 0;
        if (occurrences === 0 || totalOccurrences === 0) continue;
        const needed = Math.round(
          (rlc.requiredCount * occurrences) / totalOccurrences,
        );
        if (needed > 0) weekdayMap.set(weekday, needed);
      }
      let totalAssigned = 0;
      for (const count of weekdayMap.values()) totalAssigned += count;
      if (totalAssigned !== rlc.requiredCount) {
        const difference = rlc.requiredCount - totalAssigned;
        const sortedWeekdays = [...weeklyDayRules].sort(
          (a, b) =>
            (weekdayOccurrences[b.weekday] ?? 0) -
            (weekdayOccurrences[a.weekday] ?? 0),
        );
        let remaining = difference;
        for (const rule of sortedWeekdays) {
          if (remaining === 0) break;
          const weekday = rule.weekday;
          const current = weekdayMap.get(weekday) ?? 0;
          if (remaining > 0) {
            weekdayMap.set(weekday, current + 1);
            remaining--;
          } else if (remaining < 0 && current > 0) {
            weekdayMap.set(weekday, current - 1);
            remaining++;
          }
        }
      }
      subjectWeekdayRequirements.set(rlc.subjectId, weekdayMap);
    }
    await db.fixedTimetableSlot.deleteMany({ where: { termId: data.termId } });
    const slotsToCreate: Array<{
      termId: string;
      weekday: number;
      daySlotIndex: number;
      subjectId: string;
      name: null;
      note: null;
    }> = [];
    for (const rule of weeklyDayRules) {
      const weekday = rule.weekday;
      const slotCount = rule.defaultSlotCount;
      const occurrences = weekdayOccurrences[weekday] ?? 0;
      if (occurrences === 0 || slotCount === 0) continue;
      const subjectsNeeded: Array<{
        subjectId: string;
        count: number;
        requiredCount: number;
      }> = [];
      for (const rlc of requiredLessonCounts) {
        const needed =
          subjectWeekdayRequirements.get(rlc.subjectId)?.get(weekday) ?? 0;
        if (needed > 0) {
          subjectsNeeded.push({
            subjectId: rlc.subjectId,
            count: needed,
            requiredCount: rlc.requiredCount,
          });
        }
      }
      subjectsNeeded.sort((a, b) => b.requiredCount - a.requiredCount);
      const assignedSubjectsInDay = new Set<string>();
      const subjectAssignmentCount = new Map<string, number>();
      for (const { subjectId, count } of subjectsNeeded) {
        subjectAssignmentCount.set(subjectId, count);
      }
      for (let slotIndex = 1; slotIndex <= slotCount; slotIndex++) {
        let assignedSubjectId: string | null = null;
        for (const { subjectId } of subjectsNeeded) {
          const remaining = subjectAssignmentCount.get(subjectId) ?? 0;
          if (!assignedSubjectsInDay.has(subjectId) && remaining > 0) {
            assignedSubjectId = subjectId;
            assignedSubjectsInDay.add(subjectId);
            subjectAssignmentCount.set(subjectId, remaining - 1);
            break;
          }
        }
        if (!assignedSubjectId) {
          for (const { subjectId } of subjectsNeeded) {
            const remaining = subjectAssignmentCount.get(subjectId) ?? 0;
            if (remaining > 0) {
              assignedSubjectId = subjectId;
              subjectAssignmentCount.set(subjectId, remaining - 1);
              break;
            }
          }
        }
        if (assignedSubjectId) {
          slotsToCreate.push({
            termId: data.termId,
            weekday,
            daySlotIndex: slotIndex,
            subjectId: assignedSubjectId,
            name: null,
            note: null,
          });
        }
      }
    }
    if (slotsToCreate.length > 0) {
      await db.fixedTimetableSlot.createMany({ data: slotsToCreate });
    }
  });
