import { beforeEach, describe, expect, it } from "vitest";
import { setupDb } from "./helpers";
import {
  createTermImpl,
  getTermDashboardImpl,
  getTermSettingsImpl,
  listTermsImpl,
} from "@/actions/terms";
import type { AppPrismaClient } from "@packages/db";

describe("terms actions", () => {
  let db: AppPrismaClient;

  beforeEach(async () => {
    db = await setupDb();
  });

  describe("createTermImpl", () => {
    it("creates a term with weeklyDayRules, calendarDays and actualTimetableSlots", async () => {
      const { termId } = await createTermImpl(db, {
        name: "1学期",
        // Mon 2025-04-07 through Sun 2025-04-13 — 7 days, 5 weekdays, no JP holiday
        startsAt: new Date("2025-04-07T00:00:00.000Z"),
        endsAt: new Date("2025-04-13T00:00:00.000Z"),
        counts: { 1: 6, 2: 6, 3: 6, 4: 6, 5: 4 },
      });

      const term = await db.term.findUnique({ where: { id: termId } });
      expect(term).not.toBeNull();
      expect(term?.name).toBe("1学期");

      const rules = await db.weeklyDayRule.findMany({
        where: { termId },
        orderBy: { weekday: "asc" },
      });
      expect(rules.map((r) => r.weekday)).toEqual([1, 2, 3, 4, 5]);
      expect(rules.map((r) => r.defaultSlotCount)).toEqual([6, 6, 6, 6, 4]);

      const calendarDays = await db.calendarDay.findMany({
        where: { termId },
        orderBy: { date: "asc" },
      });
      expect(calendarDays).toHaveLength(7);

      // Weekend days (Sat 2025-04-12, Sun 2025-04-13) should be WEEKLY_OFF with 0 slots
      const weeklyOffs = calendarDays.filter((d) => d.dayType === "WEEKLY_OFF");
      expect(weeklyOffs).toHaveLength(2);
      for (const d of weeklyOffs) expect(d.slotCount).toBe(0);

      const normals = calendarDays.filter((d) => d.dayType === "NORMAL");
      expect(normals).toHaveLength(5);

      // Slots: Mon-Thu 6x4=24, Fri 4 → 28
      const slotCount = await db.actualTimetableSlot.count({
        where: { termId },
      });
      expect(slotCount).toBe(28);
    });

    it("marks Japanese holidays as HOLIDAY with zero slots", async () => {
      // 2025-05-05 (Mon, Children's Day) is a holiday in JP
      const { termId } = await createTermImpl(db, {
        name: "GW",
        startsAt: new Date("2025-05-05T00:00:00.000Z"),
        endsAt: new Date("2025-05-05T00:00:00.000Z"),
        counts: { 1: 6, 2: 6, 3: 6, 4: 6, 5: 6 },
      });
      const days = await db.calendarDay.findMany({ where: { termId } });
      expect(days).toHaveLength(1);
      expect(days[0].dayType).toBe("HOLIDAY");
      expect(days[0].slotCount).toBe(0);
      expect(days[0].title).toBe("こどもの日");
    });
  });

  describe("listTermsImpl", () => {
    it("returns terms ordered by startsAt ascending", async () => {
      await createTermImpl(db, {
        name: "2学期",
        startsAt: new Date("2025-09-01T00:00:00.000Z"),
        endsAt: new Date("2025-09-05T00:00:00.000Z"),
        counts: { 1: 6, 2: 6, 3: 6, 4: 6, 5: 6 },
      });
      await createTermImpl(db, {
        name: "1学期",
        startsAt: new Date("2025-04-07T00:00:00.000Z"),
        endsAt: new Date("2025-04-11T00:00:00.000Z"),
        counts: { 1: 6, 2: 6, 3: 6, 4: 6, 5: 6 },
      });

      const terms = await listTermsImpl(db);
      expect(terms.map((t) => t.name)).toEqual(["1学期", "2学期"]);
      expect(terms[0].startsAtIso).toBe("2025-04-07T00:00:00.000Z");
    });

    it("returns empty array when no terms exist", async () => {
      const terms = await listTermsImpl(db);
      expect(terms).toEqual([]);
    });
  });

  describe("getTermDashboardImpl", () => {
    it("returns null for nonexistent term", async () => {
      const result = await getTermDashboardImpl(db, { termId: "missing" });
      expect(result).toBeNull();
    });

    it("returns aggregated counts and weekday slot counts", async () => {
      const { termId } = await createTermImpl(db, {
        name: "1学期",
        startsAt: new Date("2025-04-07T00:00:00.000Z"),
        endsAt: new Date("2025-04-13T00:00:00.000Z"),
        counts: { 1: 6, 2: 6, 3: 6, 4: 6, 5: 4 },
      });

      const result = await getTermDashboardImpl(db, { termId });
      expect(result).not.toBeNull();
      expect(result?.calendarDaysCount).toBe(7);
      expect(result?.weekdaySlotCounts).toEqual({ 1: 6, 2: 6, 3: 6, 4: 6, 5: 4 });
      expect(result?.requiredLessonCountsCount).toBe(0);
      expect(result?.fixedTimetableSlotsCount).toBe(0);
    });
  });

  describe("getTermSettingsImpl", () => {
    it("returns null for nonexistent term", async () => {
      const result = await getTermSettingsImpl(db, { termId: "missing" });
      expect(result).toBeNull();
    });

    it("returns totalAvailableSlots counting NORMAL/SCHOOL_EVENT non-disabled slots", async () => {
      const { termId } = await createTermImpl(db, {
        name: "1学期",
        startsAt: new Date("2025-04-07T00:00:00.000Z"),
        endsAt: new Date("2025-04-11T00:00:00.000Z"),
        counts: { 1: 6, 2: 6, 3: 6, 4: 6, 5: 6 },
      });
      const result = await getTermSettingsImpl(db, { termId });
      // Mon-Fri all 6 slots, 5 days × 6 = 30
      expect(result?.totalAvailableSlots).toBe(30);
      expect(result?.subjects).toEqual([]);
    });
  });
});
