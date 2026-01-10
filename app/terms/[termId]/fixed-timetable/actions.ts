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

  revalidatePath(`/terms/${termId}/fixed-timetable`);
}

export async function deleteFixedTimetableSlot(formData: FormData) {
  const termId = String(formData.get("termId") ?? "");
  const weekdayValue = Number(formData.get("weekday") ?? 0);
  const daySlotIndexValue = Number(formData.get("daySlotIndex") ?? 0);

  if (!termId) {
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

  await prisma.fixedTimetableSlot.delete({
    where: {
      termId_weekday_daySlotIndex: {
        termId,
        weekday: weekdayValue,
        daySlotIndex: daySlotIndexValue,
      },
    },
  });

  revalidatePath(`/terms/${termId}/fixed-timetable`);
}


