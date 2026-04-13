import { beforeEach, describe, expect, it } from "vitest";
import { setupDb } from "./helpers";
import {
  getCalendarDayImpl,
  saveCalendarDayImpl,
} from "@/lib/server/actions/calendar";
import { createTermImpl } from "@/lib/server/actions/terms";
import type { AppPrismaClient } from "@/lib/prisma/prisma";

async function seedTerm(db: AppPrismaClient) {
  const { termId } = await createTermImpl(db, {
    name: "1学期",
    startsAt: new Date("2025-04-07T00:00:00.000Z"),
    endsAt: new Date("2025-04-11T00:00:00.000Z"),
    counts: { 1: 6, 2: 6, 3: 6, 4: 6, 5: 6 },
  });
  return termId;
}

describe("calendar actions", () => {
  let db: AppPrismaClient;

  beforeEach(async () => {
    db = await setupDb();
  });

  describe("getCalendarDayImpl", () => {
    it("returns null for a date outside the term", async () => {
      const termId = await seedTerm(db);
      const result = await getCalendarDayImpl(db, {
        termId,
        date: new Date("2099-01-01T00:00:00.000Z"),
      });
      expect(result).toBeNull();
    });

    it("returns the day with its slot list", async () => {
      const termId = await seedTerm(db);
      const result = await getCalendarDayImpl(db, {
        termId,
        date: new Date("2025-04-07T00:00:00.000Z"),
      });
      expect(result).not.toBeNull();
      expect(result?.dayType).toBe("NORMAL");
      expect(result?.slotCount).toBe(6);
      expect(result?.daySlots).toHaveLength(6);
      expect(result?.daySlots.map((s) => s.daySlotIndex).sort()).toEqual([
        1, 2, 3, 4, 5, 6,
      ]);
      for (const s of result!.daySlots) {
        expect(s.disabledReason).toBeNull();
      }
    });
  });

  describe("saveCalendarDayImpl", () => {
    it("updates existing day, replaces slots, and marks disabled slots", async () => {
      const termId = await seedTerm(db);
      const date = new Date("2025-04-07T00:00:00.000Z");

      await saveCalendarDayImpl(db, {
        termId,
        date,
        dayTypeValue: "SCHOOL_EVENT",
        slotCount: 4,
        title: "遠足",
        disabledSlots: [2, 3],
      });

      const day = await db.calendarDay.findUnique({
        where: { termId_date: { termId, date } },
      });
      expect(day?.dayType).toBe("SCHOOL_EVENT");
      expect(day?.slotCount).toBe(4);
      expect(day?.title).toBe("遠足");

      const slots = await db.actualTimetableSlot.findMany({
        where: { calendarDayId: day!.id },
        orderBy: { daySlotIndex: "asc" },
      });
      expect(slots).toHaveLength(4);
      expect(slots.map((s) => s.daySlotIndex)).toEqual([1, 2, 3, 4]);
      expect(slots.map((s) => s.disabledReason)).toEqual([
        null,
        "manual",
        "manual",
        null,
      ]);
    });

    it("creates a new calendar day when none exists", async () => {
      const termId = await seedTerm(db);
      // 2025-04-20 is outside the seeded term range; still allowed by the impl
      const date = new Date("2025-04-20T00:00:00.000Z");

      const { calendarDayId } = await saveCalendarDayImpl(db, {
        termId,
        date,
        dayTypeValue: "NORMAL",
        slotCount: 2,
        title: "",
        disabledSlots: [],
      });

      const day = await db.calendarDay.findUnique({
        where: { id: calendarDayId },
      });
      expect(day).not.toBeNull();
      expect(day?.title).toBeNull();

      const slots = await db.actualTimetableSlot.findMany({
        where: { calendarDayId },
      });
      expect(slots).toHaveLength(2);
    });

    it("setting slotCount=0 removes all slots for the day", async () => {
      const termId = await seedTerm(db);
      const date = new Date("2025-04-08T00:00:00.000Z");

      const before = await db.actualTimetableSlot.count({
        where: { calendarDay: { termId, date } },
      });
      expect(before).toBe(6);

      await saveCalendarDayImpl(db, {
        termId,
        date,
        dayTypeValue: "HOLIDAY",
        slotCount: 0,
        title: "臨時休校",
        disabledSlots: [],
      });

      const after = await db.actualTimetableSlot.count({
        where: { calendarDay: { termId, date } },
      });
      expect(after).toBe(0);
      const day = await db.calendarDay.findUnique({
        where: { termId_date: { termId, date } },
      });
      expect(day?.dayType).toBe("HOLIDAY");
      expect(day?.title).toBe("臨時休校");
    });
  });
});
