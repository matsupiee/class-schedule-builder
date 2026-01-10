"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma/prisma";
import { DayType } from "@/generated/prisma/client";

const DAY_TYPES = ["NORMAL", "WEEKLY_OFF", "HOLIDAY", "SCHOOL_EVENT"] as const;

function toUtcDate(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map((value) => Number(value));
  if (!year || !month || !day) {
    return new Date("invalid");
  }
  return new Date(Date.UTC(year, month - 1, day));
}

export async function saveCalendarDay(formData: FormData) {
  const termId = String(formData.get("termId") ?? "");
  const dateValue = String(formData.get("date") ?? "");
  const dayTypeValue = String(formData.get("dayType") ?? "NORMAL");
  const slotCountValue = Number(formData.get("slotCount"));
  const titleValue = String(formData.get("title") ?? "").trim();
  const disabledSlots = formData
    .getAll("disabledSlots")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (!termId || !dateValue) {
    return;
  }

  if (!DAY_TYPES.includes(dayTypeValue as (typeof DAY_TYPES)[number])) {
    return;
  }

  if (!Number.isInteger(slotCountValue) || slotCountValue < 0) {
    return;
  }

  const date = toUtcDate(dateValue);
  if (Number.isNaN(date.getTime())) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.calendarDay.findUnique({
      where: {
        termId_date: {
          termId,
          date,
        },
      },
    });

    const calendarDay = existing
      ? await tx.calendarDay.update({
          where: { id: existing.id },
          data: {
            dayType: dayTypeValue as DayType,
            slotCount: slotCountValue,
            title: titleValue || null,
          },
        })
      : await tx.calendarDay.create({
          data: {
            termId,
            date,
            dayType: dayTypeValue as DayType,
            slotCount: slotCountValue,
            title: titleValue || null,
          },
        });

    await tx.daySlot.deleteMany({
      where: { calendarDayId: calendarDay.id },
    });

    if (slotCountValue > 0) {
      await tx.daySlot.createMany({
        data: Array.from({ length: slotCountValue }, (_, index) => {
          const daySlotIndex = index + 1;
          return {
            calendarDayId: calendarDay.id,
            daySlotIndex,
            disabledReason: disabledSlots.includes(daySlotIndex)
              ? "manual"
              : null,
          };
        }),
      });
    }
  });

  revalidatePath(`/terms/${termId}/calendar`);
}
