"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma/prisma";

// 自動生成のためのヘルパー関数
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function saveTimetablePlanSlot(formData: FormData) {
  const timetablePlanId = String(formData.get("timetablePlanId") ?? "");
  const weekdayValue = Number(formData.get("weekday") ?? 0);
  const daySlotIndexValue = Number(formData.get("daySlotIndex") ?? 0);
  const subjectId = String(formData.get("subjectId") ?? "");

  if (!timetablePlanId || !subjectId) {
    return;
  }

  if (!Number.isInteger(weekdayValue) || weekdayValue < 1 || weekdayValue > 7) {
    return;
  }

  if (!Number.isInteger(daySlotIndexValue) || daySlotIndexValue < 1) {
    return;
  }

  // 既存のスロットを確認
  const existing = await prisma.timetablePlanSlot.findFirst({
    where: {
      timetablePlanId,
      weekday: weekdayValue,
      daySlotIndex: daySlotIndexValue,
    },
  });

  if (existing) {
    // 更新
    await prisma.timetablePlanSlot.update({
      where: { id: existing.id },
      data: {
        subjectId,
      },
    });
  } else {
    // 新規作成
    await prisma.timetablePlanSlot.create({
      data: {
        timetablePlanId,
        weekday: weekdayValue,
        daySlotIndex: daySlotIndexValue,
        subjectId,
      },
    });
  }

  const plan = await prisma.timetablePlan.findUnique({
    where: { id: timetablePlanId },
  });

  if (plan) {
    revalidatePath(`/terms/${plan.termId}/timetables/${timetablePlanId}`);
    revalidatePath(`/terms/${plan.termId}/timetables`);
  }
}

export async function deleteTimetablePlanSlot(formData: FormData) {
  const timetablePlanId = String(formData.get("timetablePlanId") ?? "");
  const weekdayValue = Number(formData.get("weekday") ?? 0);
  const daySlotIndexValue = Number(formData.get("daySlotIndex") ?? 0);

  if (!timetablePlanId) {
    return;
  }

  if (!Number.isInteger(weekdayValue) || weekdayValue < 1 || weekdayValue > 7) {
    return;
  }

  if (!Number.isInteger(daySlotIndexValue) || daySlotIndexValue < 1) {
    return;
  }

  const existing = await prisma.timetablePlanSlot.findFirst({
    where: {
      timetablePlanId,
      weekday: weekdayValue,
      daySlotIndex: daySlotIndexValue,
    },
  });

  if (existing) {
    await prisma.timetablePlanSlot.delete({
      where: { id: existing.id },
    });
  }

  const plan = await prisma.timetablePlan.findUnique({
    where: { id: timetablePlanId },
  });

  if (plan) {
    revalidatePath(`/terms/${plan.termId}/timetables/${timetablePlanId}`);
    revalidatePath(`/terms/${plan.termId}/timetables`);
  }
}

export async function autoGenerateTimetable(formData: FormData) {
  const termId = String(formData.get("termId") ?? "");
  const timetablePlanId = String(formData.get("timetablePlanId") ?? "");

  if (!termId || !timetablePlanId) {
    return;
  }

  // 法定の必要授業数を取得
  const requiredLessonCounts = await prisma.requiredLessonCount.findMany({
    where: { termId },
  });

  if (requiredLessonCounts.length === 0) {
    return;
  }

  // 週次ルールを取得
  const weeklyDayRules = await prisma.weeklyDayRule.findMany({
    where: { termId },
    orderBy: { weekday: "asc" },
  });

  const weekdaySlotCounts: Record<number, number> = {};
  for (const rule of weeklyDayRules) {
    weekdaySlotCounts[rule.weekday] = rule.defaultSlotCount;
  }

  // term中の各曜日の出現回数を計算
  const calendarDays = await prisma.calendarDay.findMany({
    where: {
      termId,
      dayType: {
        in: ["NORMAL", "SCHOOL_EVENT"],
      },
    },
  });

  const weekdayOccurrences: Record<number, number> = {};
  for (const day of calendarDays) {
    const jsWeekday = day.date.getUTCDay();
    if (jsWeekday >= 1 && jsWeekday <= 5) {
      weekdayOccurrences[jsWeekday] = (weekdayOccurrences[jsWeekday] ?? 0) + 1;
    }
  }

  // 各科目について、各曜日に何回割り当てる必要があるかを計算
  // 必要授業数 / その曜日の出現回数 = その曜日に割り当てる回数（週次グリッドなので）
  const subjectWeekdayRequirements = new Map<string, Map<number, number>>();
  for (const rlc of requiredLessonCounts) {
    const weekdayMap = new Map<number, number>();
    let totalAssigned = 0;

    // 各曜日について、必要授業数を均等に分散
    const weekdays = [1, 2, 3, 4, 5];
    const availableWeekdays = weekdays.filter(
      (wd) => weekdayOccurrences[wd] > 0 && weekdaySlotCounts[wd] > 0
    );

    if (availableWeekdays.length === 0) {
      continue;
    }

    // 各曜日に均等に割り当てる
    const basePerWeekday = Math.floor(
      rlc.requiredCount / availableWeekdays.length
    );
    const remainder = rlc.requiredCount % availableWeekdays.length;

    for (let i = 0; i < availableWeekdays.length; i++) {
      const weekday = availableWeekdays[i];
      const count = basePerWeekday + (i < remainder ? 1 : 0);
      if (count > 0) {
        weekdayMap.set(weekday, count);
        totalAssigned += count;
      }
    }

    // 必要授業数に満たない場合は、残りを均等に追加
    if (totalAssigned < rlc.requiredCount) {
      const remaining = rlc.requiredCount - totalAssigned;
      for (let i = 0; i < remaining; i++) {
        const weekday = availableWeekdays[i % availableWeekdays.length];
        weekdayMap.set(weekday, (weekdayMap.get(weekday) ?? 0) + 1);
      }
    }

    subjectWeekdayRequirements.set(rlc.subjectId, weekdayMap);
  }

  // 各曜日・各コマに科目を割り振る
  const slots: Array<{
    timetablePlanId: string;
    weekday: number;
    daySlotIndex: number;
    subjectId: string;
  }> = [];

  // 前日の各コマの科目を記録（連続を避けるため）
  const previousDaySubjects: Record<number, string[]> = {};

  // 各曜日について処理
  for (const rule of weeklyDayRules) {
    const weekday = rule.weekday;
    const slotCount = rule.defaultSlotCount;
    const occurrences = weekdayOccurrences[weekday] ?? 0;

    if (occurrences === 0 || slotCount === 0) continue;

    // この曜日に割り当てる必要がある科目とその回数を取得
    const subjectsNeeded: Array<{ subjectId: string; count: number }> = [];
    for (const [
      subjectId,
      weekdayMap,
    ] of subjectWeekdayRequirements.entries()) {
      const needed = weekdayMap.get(weekday) ?? 0;
      if (needed > 0) {
        subjectsNeeded.push({ subjectId, count: needed });
      }
    }

    // 科目をシャッフルして分散させる
    const shuffledSubjects = shuffleArray(subjectsNeeded);

    // 各コマに科目を割り当て
    // 1日に同じ科目が2コマ以上入らないようにする
    const assignedSubjectsInDay = new Set<string>();

    for (let slotIndex = 1; slotIndex <= slotCount; slotIndex++) {
      let assignedSubjectId: string | null = null;

      // 前日の同じコマの科目を避ける
      const prevWeekday = weekday === 1 ? 5 : weekday - 1;
      const previousSubject = previousDaySubjects[prevWeekday]?.[slotIndex - 1];

      // 利用可能な科目から選択
      // 優先順位: 1. 前日と連続しない 2. まだこの曜日に割り当てられていない 3. 必要回数が多い
      const candidates = shuffledSubjects
        .filter((s) => {
          // 1日に同じ科目が2コマ以上入らない
          if (assignedSubjectsInDay.has(s.subjectId)) {
            return false;
          }
          return true;
        })
        .sort((a, b) => {
          // 前日と連続しないものを優先
          if (previousSubject) {
            if (
              a.subjectId === previousSubject &&
              b.subjectId !== previousSubject
            ) {
              return 1;
            }
            if (
              a.subjectId !== previousSubject &&
              b.subjectId === previousSubject
            ) {
              return -1;
            }
          }
          // 必要回数が多いものを優先
          return b.count - a.count;
        });

      if (candidates.length > 0) {
        assignedSubjectId = candidates[0].subjectId;
        assignedSubjectsInDay.add(assignedSubjectId);

        // 必要回数を減らす
        const candidate = candidates[0];
        candidate.count--;
        if (candidate.count <= 0) {
          // 必要回数が0になったらリストから削除
          const index = shuffledSubjects.indexOf(candidate);
          if (index > -1) {
            shuffledSubjects.splice(index, 1);
          }
        }
      }

      if (assignedSubjectId) {
        slots.push({
          timetablePlanId,
          weekday,
          daySlotIndex: slotIndex,
          subjectId: assignedSubjectId,
        });
      }
    }

    // 前日の科目を記録
    previousDaySubjects[weekday] = slots
      .filter((s) => s.weekday === weekday)
      .map((s) => s.subjectId);
  }

  // 既存のスロットを削除
  await prisma.timetablePlanSlot.deleteMany({
    where: { timetablePlanId },
  });

  // 新しいスロットを作成
  if (slots.length > 0) {
    await prisma.timetablePlanSlot.createMany({
      data: slots,
    });
  }

  const plan = await prisma.timetablePlan.findUnique({
    where: { id: timetablePlanId },
  });

  if (plan) {
    revalidatePath(`/terms/${plan.termId}/timetables/${timetablePlanId}`);
    revalidatePath(`/terms/${plan.termId}/timetables`);
  }
}
