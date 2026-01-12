"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma/prisma";

export async function saveFixedTimetableSlot(formData: FormData) {
  const termId = String(formData.get("termId") ?? "");
  const weekdayValue = Number(formData.get("weekday") ?? 0);
  const daySlotIndexValue = Number(formData.get("daySlotIndex") ?? 0);
  const subjectId = String(formData.get("subjectId") ?? "");
  const name = String(formData.get("name") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!termId || !subjectId) {
    return;
  }

  if (!Number.isInteger(weekdayValue) || weekdayValue < 1 || weekdayValue > 7) {
    return;
  }

  if (!Number.isInteger(daySlotIndexValue) || daySlotIndexValue < 1) {
    return;
  }

  await prisma.fixedTimetableSlot.upsert({
    where: {
      termId_weekday_daySlotIndex: {
        termId,
        weekday: weekdayValue,
        daySlotIndex: daySlotIndexValue,
      },
    },
    update: {
      subjectId,
      name,
      note,
    },
    create: {
      termId,
      weekday: weekdayValue,
      daySlotIndex: daySlotIndexValue,
      subjectId,
      name,
      note,
    },
  });

  revalidatePath(`/terms/${termId}/settings`);
}

export async function deleteFixedTimetableSlot(formData: FormData) {
  const termId = String(formData.get("termId") ?? "");
  const weekdayValue = Number(formData.get("weekday") ?? 0);
  const daySlotIndexValue = Number(formData.get("daySlotIndex") ?? 0);

  if (!termId) {
    return;
  }

  if (!Number.isInteger(weekdayValue) || weekdayValue < 1 || weekdayValue > 7) {
    return;
  }

  if (!Number.isInteger(daySlotIndexValue) || daySlotIndexValue < 1) {
    return;
  }

  await prisma.fixedTimetableSlot.delete({
    where: {
      termId_weekday_daySlotIndex: {
        termId,
        weekday: weekdayValue,
        daySlotIndex: daySlotIndexValue,
      },
    },
  });

  revalidatePath(`/terms/${termId}/settings`);
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export type AutoGenerateFixedTimetableState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export async function autoGenerateFixedTimetable(
  _prevState: AutoGenerateFixedTimetableState,
  formData: FormData
): Promise<AutoGenerateFixedTimetableState> {
  const termId = String(formData.get("termId") ?? "");

  if (!termId) {
    return { status: "error", message: "学期IDが指定されていません。" };
  }

  try {
    // 法定の必要授業数を取得
    const requiredLessonCounts = await prisma.requiredLessonCount.findMany({
      where: { termId },
    });

    if (requiredLessonCounts.length === 0) {
      return {
        status: "error",
        message: "法定の必要授業数が設定されていません。",
      };
    }

    // 週次ルールを取得
    const weeklyDayRules = await prisma.weeklyDayRule.findMany({
      where: { termId },
      orderBy: { weekday: "asc" },
    });

    if (weeklyDayRules.length === 0) {
      return {
        status: "error",
        message: "週次ルールが設定されていません。",
      };
    }

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
        weekdayOccurrences[jsWeekday] =
          (weekdayOccurrences[jsWeekday] ?? 0) + 1;
      }
    }

    // 各科目について、各曜日に何回割り当てる必要があるかを計算
    // 必要授業数に応じて、各曜日の出現回数を考慮して配分
    const subjectWeekdayRequirements = new Map<string, Map<number, number>>();

    // 全曜日の出現回数の合計を計算
    let totalOccurrences = 0;
    for (const rule of weeklyDayRules) {
      const occurrences = weekdayOccurrences[rule.weekday] ?? 0;
      totalOccurrences += occurrences;
    }

    for (const rlc of requiredLessonCounts) {
      const weekdayMap = new Map<number, number>();

      // 各曜日について、必要授業数に応じて配分
      for (const rule of weeklyDayRules) {
        const weekday = rule.weekday;
        const occurrences = weekdayOccurrences[weekday] ?? 0;

        if (occurrences === 0 || totalOccurrences === 0) continue;

        // 必要授業数を各曜日の出現回数に比例して配分
        // 例: 必要授業数50、月曜日が10回出現、全曜日合計50回の場合
        // 50 * (10 / 50) = 10回を月曜日に割り当て
        const needed = Math.round(
          (rlc.requiredCount * occurrences) / totalOccurrences
        );

        if (needed > 0) {
          weekdayMap.set(weekday, needed);
        }
      }

      // 配分の合計が必要授業数と一致しない場合の調整
      let totalAssigned = 0;
      for (const count of weekdayMap.values()) {
        totalAssigned += count;
      }

      if (totalAssigned !== rlc.requiredCount) {
        const difference = rlc.requiredCount - totalAssigned;
        // 差を出現回数が多い曜日に追加（または削除）
        const sortedWeekdays = [...weeklyDayRules].sort(
          (a, b) =>
            (weekdayOccurrences[b.weekday] ?? 0) -
            (weekdayOccurrences[a.weekday] ?? 0)
        );

        let remainingDiff = difference;
        for (const rule of sortedWeekdays) {
          if (remainingDiff === 0) break;
          const weekday = rule.weekday;
          const current = weekdayMap.get(weekday) ?? 0;
          if (remainingDiff > 0) {
            weekdayMap.set(weekday, current + 1);
            remainingDiff--;
          } else if (remainingDiff < 0 && current > 0) {
            weekdayMap.set(weekday, current - 1);
            remainingDiff++;
          }
        }
      }

      subjectWeekdayRequirements.set(rlc.subjectId, weekdayMap);
    }

    // 既存の固定時間割を削除
    await prisma.fixedTimetableSlot.deleteMany({
      where: { termId },
    });

    // 各曜日について処理
    const slotsToCreate = [];
    for (const rule of weeklyDayRules) {
      const weekday = rule.weekday;
      const slotCount = rule.defaultSlotCount;
      const occurrences = weekdayOccurrences[weekday] ?? 0;

      if (occurrences === 0 || slotCount === 0) continue;

      // この曜日に割り当てる必要がある科目とその回数を取得
      // 必要授業数が多い順にソート
      const subjectsNeeded: Array<{
        subjectId: string;
        count: number;
        requiredCount: number;
      }> = [];
      for (const rlc of requiredLessonCounts) {
        const weekdayMap = subjectWeekdayRequirements.get(rlc.subjectId);
        const needed = weekdayMap?.get(weekday) ?? 0;
        if (needed > 0) {
          subjectsNeeded.push({
            subjectId: rlc.subjectId,
            count: needed,
            requiredCount: rlc.requiredCount,
          });
        }
      }

      // 必要授業数が多い順にソート（必要授業数が多い科目を優先）
      subjectsNeeded.sort((a, b) => b.requiredCount - a.requiredCount);

      // 各コマに科目を割り当て
      // 1日に同じ科目が2コマ以上入らないようにする
      const assignedSubjectsInDay = new Set<string>();
      // 各科目の割り当て回数を追跡
      const subjectAssignmentCount = new Map<string, number>();
      for (const { subjectId, count } of subjectsNeeded) {
        subjectAssignmentCount.set(subjectId, count);
      }

      for (let slotIndex = 1; slotIndex <= slotCount; slotIndex++) {
        let assignedSubjectId: string | null = null;

        // まだ割り当てられていない科目で、割り当て回数が残っているものを優先
        for (const { subjectId, count } of subjectsNeeded) {
          const remaining = subjectAssignmentCount.get(subjectId) ?? 0;
          if (!assignedSubjectsInDay.has(subjectId) && remaining > 0) {
            assignedSubjectId = subjectId;
            assignedSubjectsInDay.add(subjectId);
            subjectAssignmentCount.set(subjectId, remaining - 1);
            break;
          }
        }

        // まだ割り当てられていない科目がない場合は、割り当て回数が残っている科目を探す
        if (!assignedSubjectId) {
          for (const { subjectId, count } of subjectsNeeded) {
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
            termId,
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
      await prisma.fixedTimetableSlot.createMany({
        data: slotsToCreate,
      });
    }

    revalidatePath(`/terms/${termId}/settings`);
    return { status: "success" };
  } catch (error) {
    console.error("自動生成エラー:", error);
    return {
      status: "error",
      message: "自動生成に失敗しました。",
    };
  }
}
