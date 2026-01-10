"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma/prisma";

export async function saveTimetablePlanSlot(formData: FormData) {
  const timetablePlanId = String(formData.get("timetablePlanId") ?? "");
  const weekdayValue = Number(formData.get("weekday") ?? 0);
  const daySlotIndexValue = Number(formData.get("daySlotIndex") ?? 0);
  const subjectId = String(formData.get("subjectId") ?? "");

  if (!timetablePlanId || !subjectId) {
    return;
  }

  if (
    !Number.isInteger(weekdayValue) ||
    weekdayValue < 1 ||
    weekdayValue > 7
  ) {
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

  if (
    !Number.isInteger(weekdayValue) ||
    weekdayValue < 1 ||
    weekdayValue > 7
  ) {
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


