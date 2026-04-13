import { createServerFn } from "@tanstack/react-start";
import { getDb } from "@/lib/server/db";
import type { DayType } from "@/generated/prisma/client";

const DAY_TYPES = ["NORMAL", "WEEKLY_OFF", "HOLIDAY", "SCHOOL_EVENT"] as const;

function toUtcDate(dateValue: string): Date | null {
  const [y, m, d] = dateValue.split("-").map((v) => Number(v));
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

export const getCalendarDay = createServerFn({ method: "GET" })
  .inputValidator((data: { termId: string; date: string }) => {
    const termId = String(data?.termId ?? "");
    const date = String(data?.date ?? "");
    if (!termId || !date) throw new Error("termId and date are required");
    return { termId, date };
  })
  .handler(async ({ data }) => {
    const date = toUtcDate(data.date);
    if (!date) throw new Error("invalid_date");
    const db = getDb();
    const calendarDay = await db.calendarDay.findFirst({
      where: { termId: data.termId, date },
      include: { actualTimetableSlots: true },
    });
    if (!calendarDay) return null;
    return {
      dayType: calendarDay.dayType,
      slotCount: calendarDay.slotCount,
      title: calendarDay.title,
      daySlots: calendarDay.actualTimetableSlots.map((slot) => ({
        daySlotIndex: slot.daySlotIndex,
        disabledReason: slot.disabledReason,
      })),
    };
  });

export const saveCalendarDay = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      termId: string;
      date: string;
      dayType: string;
      slotCount: number;
      title: string;
      disabledSlots: number[];
    }) => {
      const termId = String(data?.termId ?? "");
      const dateValue = String(data?.date ?? "");
      const dayTypeValue = String(data?.dayType ?? "NORMAL");
      const slotCount = Number(data?.slotCount ?? 0);
      const title = String(data?.title ?? "").trim();
      const disabledSlots = (data?.disabledSlots ?? [])
        .map((v) => Number(v))
        .filter((v) => Number.isInteger(v) && v > 0);
      if (!termId || !dateValue) throw new Error("必須項目が不足しています。");
      if (!DAY_TYPES.includes(dayTypeValue as (typeof DAY_TYPES)[number])) {
        throw new Error("無効な日種別です。");
      }
      if (!Number.isInteger(slotCount) || slotCount < 0) {
        throw new Error("無効なコマ数です。");
      }
      const date = toUtcDate(dateValue);
      if (!date) throw new Error("無効な日付です。");
      return { termId, date, dayTypeValue, slotCount, title, disabledSlots };
    },
  )
  .handler(async ({ data }) => {
    const db = getDb();
    await db.$transaction(async (tx) => {
      const existing = await tx.calendarDay.findUnique({
        where: { termId_date: { termId: data.termId, date: data.date } },
      });
      const calendarDay = existing
        ? await tx.calendarDay.update({
            where: { id: existing.id },
            data: {
              dayType: data.dayTypeValue as DayType,
              slotCount: data.slotCount,
              title: data.title || null,
            },
          })
        : await tx.calendarDay.create({
            data: {
              termId: data.termId,
              date: data.date,
              dayType: data.dayTypeValue as DayType,
              slotCount: data.slotCount,
              title: data.title || null,
            },
          });
      await tx.actualTimetableSlot.deleteMany({
        where: { calendarDayId: calendarDay.id },
      });
      if (data.slotCount > 0) {
        await tx.actualTimetableSlot.createMany({
          data: Array.from({ length: data.slotCount }, (_, index) => {
            const daySlotIndex = index + 1;
            return {
              termId: calendarDay.termId,
              calendarDayId: calendarDay.id,
              daySlotIndex,
              disabledReason: data.disabledSlots.includes(daySlotIndex)
                ? "manual"
                : null,
              subjectId: null,
              subjectUnitId: null,
              unitSlotIndex: null,
            };
          }),
        });
      }
    });
  });
