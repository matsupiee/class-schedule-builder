"use server";

import { revalidatePath } from "next/cache";

import * as holidayJp from "@holiday-jp/holiday_jp";

import { prisma } from "@/lib/prisma/prisma";

export type CreateTermState = {
  status: "idle" | "error" | "success";
  message?: string;
};

const MS_IN_DAY = 24 * 60 * 60 * 1000;
const WEEKDAY_DEFAULTS = {
  1: 6,
  2: 6,
  3: 6,
  4: 6,
  5: 6,
} as const;

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function normalizeToUtcDate(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function buildCalendarDays(
  termId: string,
  startsAt: Date,
  endsAt: Date,
  weekdaySlotCounts: Record<number, number>
) {
  const startDate = normalizeToUtcDate(startsAt);
  const endDate = normalizeToUtcDate(endsAt);
  const holidays = holidayJp.between(startDate, endDate);
  const holidayMap = new Map(
    holidays.map((holiday) => [toDateKey(holiday.date), holiday.name])
  );

  const days = [];
  for (
    let current = new Date(startDate);
    current.getTime() <= endDate.getTime();
    current = new Date(current.getTime() + MS_IN_DAY)
  ) {
    const dayKey = toDateKey(current);
    const holidayName = holidayMap.get(dayKey);
    const jsWeekday = current.getUTCDay(); // 0=日, 1=月, 2=火, 3=水, 4=木, 5=金, 6=土
    const isWeekend = jsWeekday === 0 || jsWeekday === 6;

    // JavaScriptのweekdayをWeeklyDayRuleのweekdayに変換
    // 0=日 → null, 1=月 → 1, 2=火 → 2, 3=水 → 3, 4=木 → 4, 5=金 → 5, 6=土 → null
    const weekdayRule = jsWeekday >= 1 && jsWeekday <= 5 ? jsWeekday : null;

    let dayType: "NORMAL" | "WEEKLY_OFF" | "HOLIDAY" | "SCHOOL_EVENT" =
      "NORMAL";
    let slotCount =
      weekdayRule !== null
        ? weekdaySlotCounts[weekdayRule] ?? WEEKDAY_DEFAULTS[1]
        : 0;
    let title: string | undefined;

    if (holidayName) {
      dayType = "HOLIDAY";
      slotCount = 0;
      title = holidayName;
    } else if (isWeekend) {
      dayType = "WEEKLY_OFF";
      slotCount = 0;
    }

    days.push({
      termId,
      date: new Date(current),
      dayType,
      slotCount,
      title,
    });
  }

  return days;
}

function buildWeekdaySlotCounts(
  rules: Array<{ weekday: number; defaultSlotCount: number }>
) {
  const map: Record<number, number> = {};
  for (const rule of rules) {
    map[rule.weekday] = rule.defaultSlotCount;
  }
  return map;
}

export async function createTerm(
  _prevState: CreateTermState,
  formData: FormData
): Promise<CreateTermState> {
  const name = String(formData.get("name") ?? "").trim();
  const startsAtRaw = String(formData.get("startsAt") ?? "");
  const endsAtRaw = String(formData.get("endsAt") ?? "");
  const defaultSlotCountRaw = {
    1: String(formData.get("defaultSlotCountMon") ?? ""),
    2: String(formData.get("defaultSlotCountTue") ?? ""),
    3: String(formData.get("defaultSlotCountWed") ?? ""),
    4: String(formData.get("defaultSlotCountThu") ?? ""),
    5: String(formData.get("defaultSlotCountFri") ?? ""),
  };

  if (!name || !startsAtRaw || !endsAtRaw) {
    return { status: "error", message: "入力内容を確認してください。" };
  }

  const startsAt = new Date(startsAtRaw);
  const endsAt = new Date(endsAtRaw);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { status: "error", message: "日付の形式が正しくありません。" };
  }

  if (endsAt < startsAt) {
    return { status: "error", message: "終了日は開始日以降にしてください。" };
  }

  const weekdaySlotCounts: Record<number, number> = {};
  for (const weekday of [1, 2, 3, 4, 5]) {
    const value = Number(
      defaultSlotCountRaw[weekday as keyof typeof defaultSlotCountRaw]
    );
    if (!Number.isInteger(value) || value <= 0) {
      return { status: "error", message: "コマ数は1以上で入力してください。" };
    }
    weekdaySlotCounts[weekday] = value;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const term = await tx.term.create({
        data: {
          name,
          startsAt,
          endsAt,
        },
      });
      await tx.weeklyDayRule.createMany({
        data: [1, 2, 3, 4, 5].map((weekday) => ({
          termId: term.id,
          weekday,
          defaultSlotCount: weekdaySlotCounts[weekday],
        })),
      });
      const weeklyDayRules = await tx.weeklyDayRule.findMany({
        where: { termId: term.id },
        select: { weekday: true, defaultSlotCount: true },
      });
      const calendarDays = buildCalendarDays(
        term.id,
        startsAt,
        endsAt,
        buildWeekdaySlotCounts(weeklyDayRules)
      );
      for (const calendarDay of calendarDays) {
        const created = await tx.calendarDay.create({
          data: calendarDay,
        });
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
  } catch {
    return { status: "error", message: "作成に失敗しました。" };
  }

  revalidatePath("/terms");
  return { status: "success" };
}
