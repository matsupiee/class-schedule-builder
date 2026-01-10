"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma/prisma";

export type CreateTimetablePlanState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export async function createTimetablePlan(
  _prevState: CreateTimetablePlanState,
  formData: FormData
): Promise<CreateTimetablePlanState> {
  const termId = String(formData.get("termId") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!termId || !name) {
    return { status: "error", message: "時間割名を入力してください。" };
  }

  try {
    // WeeklyDayRuleを取得
    const weeklyDayRules = await prisma.weeklyDayRule.findMany({
      where: { termId },
    });

    if (weeklyDayRules.length === 0) {
      return {
        status: "error",
        message: "週次ルールが設定されていません。",
      };
    }

    // TimetablePlanを作成
    const timetablePlan = await prisma.timetablePlan.create({
      data: {
        termId,
        name,
      },
    });

    // 固定時間割を取得
    const fixedSlots = await prisma.fixedTimetableSlot.findMany({
      where: { termId },
    });

    // 固定時間割のマップを作成（weekday-daySlotIndexをキーにする）
    const fixedSlotMap = new Map<string, string>();
    for (const fixedSlot of fixedSlots) {
      const key = `${fixedSlot.weekday}-${fixedSlot.daySlotIndex}`;
      fixedSlotMap.set(key, fixedSlot.subjectId);
    }

    // WeeklyDayRuleに基づいてTimetablePlanSlotを作成
    // 各曜日について、defaultSlotCount分のスロットを作成
    // 固定時間割がある場合はその科目を設定、ない場合はnull

    const slots = [];
    for (const rule of weeklyDayRules) {
      for (let slotIndex = 1; slotIndex <= rule.defaultSlotCount; slotIndex++) {
        const key = `${rule.weekday}-${slotIndex}`;
        const subjectId = fixedSlotMap.get(key) ?? null;

        slots.push({
          timetablePlanId: timetablePlan.id,
          weekday: rule.weekday,
          daySlotIndex: slotIndex,
          subjectId,
        });
      }
    }

    if (slots.length > 0) {
      await prisma.timetablePlanSlot.createMany({
        data: slots,
      });
    }

    revalidatePath(`/terms/${termId}/timetables`);
    revalidatePath(`/terms/${termId}/settings`);
    return { status: "success" };
  } catch {
    return { status: "error", message: "作成に失敗しました。" };
  }
}

export async function deleteTimetablePlan(formData: FormData) {
  const termId = String(formData.get("termId") ?? "");
  const timetablePlanId = String(formData.get("timetablePlanId") ?? "");

  if (!termId || !timetablePlanId) {
    return;
  }

  await prisma.timetablePlan.delete({
    where: { id: timetablePlanId },
  });

  revalidatePath(`/terms/${termId}/timetables`);
  revalidatePath(`/terms/${termId}/settings`);
}
