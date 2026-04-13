import { beforeEach, describe, expect, it } from "vitest";
import { setupDb } from "./helpers";
import {
  createSubjectUnitImpl,
  deleteSubjectUnitImpl,
  getSubjectWithUnitsImpl,
  reorderSubjectUnitsImpl,
  updateSubjectUnitImpl,
} from "@/lib/server/actions/subject-units";
import type { AppPrismaClient } from "@/lib/prisma/prisma";

async function seedSubject(db: AppPrismaClient, name = "国語") {
  return db.subject.create({ data: { name } });
}

describe("subject-units actions", () => {
  let db: AppPrismaClient;

  beforeEach(async () => {
    db = await setupDb();
  });

  describe("createSubjectUnitImpl", () => {
    it("assigns order = 1 for the first unit", async () => {
      const subject = await seedSubject(db);
      const unit = await createSubjectUnitImpl(db, {
        subjectId: subject.id,
        unitName: "ごんぎつね",
        slotCount: 8,
      });
      expect(unit.order).toBe(1);
      expect(unit.slotCount).toBe(8);
    });

    it("increments order for subsequent units", async () => {
      const subject = await seedSubject(db);
      await createSubjectUnitImpl(db, {
        subjectId: subject.id,
        unitName: "A",
        slotCount: 3,
      });
      await createSubjectUnitImpl(db, {
        subjectId: subject.id,
        unitName: "B",
        slotCount: 4,
      });
      const third = await createSubjectUnitImpl(db, {
        subjectId: subject.id,
        unitName: "C",
        slotCount: 2,
      });
      expect(third.order).toBe(3);
    });

    it("keeps order scoped per subject", async () => {
      const s1 = await seedSubject(db, "国語");
      const s2 = await seedSubject(db, "算数");
      await createSubjectUnitImpl(db, {
        subjectId: s1.id,
        unitName: "A",
        slotCount: 3,
      });
      const firstOfS2 = await createSubjectUnitImpl(db, {
        subjectId: s2.id,
        unitName: "X",
        slotCount: 5,
      });
      expect(firstOfS2.order).toBe(1);
    });
  });

  describe("getSubjectWithUnitsImpl", () => {
    it("returns subject with units ordered by order asc", async () => {
      const subject = await seedSubject(db);
      await createSubjectUnitImpl(db, {
        subjectId: subject.id,
        unitName: "A",
        slotCount: 3,
      });
      await createSubjectUnitImpl(db, {
        subjectId: subject.id,
        unitName: "B",
        slotCount: 4,
      });
      const result = await getSubjectWithUnitsImpl(db, {
        subjectId: subject.id,
      });
      expect(result?.name).toBe("国語");
      expect(result?.subjectUnits.map((u) => u.unitName)).toEqual(["A", "B"]);
      expect(result?.subjectUnits.map((u) => u.order)).toEqual([1, 2]);
    });

    it("returns null for a nonexistent subject", async () => {
      const result = await getSubjectWithUnitsImpl(db, {
        subjectId: "missing",
      });
      expect(result).toBeNull();
    });
  });

  describe("updateSubjectUnitImpl", () => {
    it("updates name and slotCount", async () => {
      const subject = await seedSubject(db);
      const unit = await createSubjectUnitImpl(db, {
        subjectId: subject.id,
        unitName: "old",
        slotCount: 3,
      });
      const ok = await updateSubjectUnitImpl(db, {
        id: unit.id,
        subjectId: subject.id,
        unitName: "new",
        slotCount: 9,
      });
      expect(ok).toBe(true);
      const after = await db.subjectUnit.findUnique({ where: { id: unit.id } });
      expect(after?.unitName).toBe("new");
      expect(after?.slotCount).toBe(9);
    });

    it("refuses update when subjectId does not match", async () => {
      const s1 = await seedSubject(db, "国語");
      const s2 = await seedSubject(db, "算数");
      const unit = await createSubjectUnitImpl(db, {
        subjectId: s1.id,
        unitName: "orig",
        slotCount: 3,
      });
      const ok = await updateSubjectUnitImpl(db, {
        id: unit.id,
        subjectId: s2.id,
        unitName: "hijack",
        slotCount: 1,
      });
      expect(ok).toBe(false);
      const after = await db.subjectUnit.findUnique({ where: { id: unit.id } });
      expect(after?.unitName).toBe("orig");
    });
  });

  describe("deleteSubjectUnitImpl", () => {
    it("deletes the unit and decrements order of subsequent units", async () => {
      const subject = await seedSubject(db);
      const a = await createSubjectUnitImpl(db, {
        subjectId: subject.id,
        unitName: "A",
        slotCount: 1,
      });
      const b = await createSubjectUnitImpl(db, {
        subjectId: subject.id,
        unitName: "B",
        slotCount: 1,
      });
      const c = await createSubjectUnitImpl(db, {
        subjectId: subject.id,
        unitName: "C",
        slotCount: 1,
      });
      expect([a.order, b.order, c.order]).toEqual([1, 2, 3]);

      const ok = await deleteSubjectUnitImpl(db, {
        id: b.id,
        subjectId: subject.id,
      });
      expect(ok).toBe(true);

      const remaining = await db.subjectUnit.findMany({
        where: { subjectId: subject.id },
        orderBy: { order: "asc" },
      });
      expect(remaining.map((u) => u.unitName)).toEqual(["A", "C"]);
      expect(remaining.map((u) => u.order)).toEqual([1, 2]);
    });

    it("refuses delete when subjectId does not match", async () => {
      const s1 = await seedSubject(db, "国語");
      const s2 = await seedSubject(db, "算数");
      const unit = await createSubjectUnitImpl(db, {
        subjectId: s1.id,
        unitName: "A",
        slotCount: 1,
      });
      const ok = await deleteSubjectUnitImpl(db, {
        id: unit.id,
        subjectId: s2.id,
      });
      expect(ok).toBe(false);
      const still = await db.subjectUnit.findUnique({ where: { id: unit.id } });
      expect(still).not.toBeNull();
    });
  });

  describe("reorderSubjectUnitsImpl", () => {
    it("reorders units to match the provided sequence", async () => {
      const subject = await seedSubject(db);
      const a = await createSubjectUnitImpl(db, {
        subjectId: subject.id,
        unitName: "A",
        slotCount: 1,
      });
      const b = await createSubjectUnitImpl(db, {
        subjectId: subject.id,
        unitName: "B",
        slotCount: 1,
      });
      const c = await createSubjectUnitImpl(db, {
        subjectId: subject.id,
        unitName: "C",
        slotCount: 1,
      });

      const ok = await reorderSubjectUnitsImpl(db, {
        subjectId: subject.id,
        orderedUnitIds: [c.id, a.id, b.id],
      });
      expect(ok).toBe(true);

      const after = await db.subjectUnit.findMany({
        where: { subjectId: subject.id },
        orderBy: { order: "asc" },
      });
      expect(after.map((u) => u.unitName)).toEqual(["C", "A", "B"]);
      expect(after.map((u) => u.order)).toEqual([1, 2, 3]);
    });

    it("returns false when an id does not belong to the subject", async () => {
      const s1 = await seedSubject(db, "国語");
      const s2 = await seedSubject(db, "算数");
      const a = await createSubjectUnitImpl(db, {
        subjectId: s1.id,
        unitName: "A",
        slotCount: 1,
      });
      const foreign = await createSubjectUnitImpl(db, {
        subjectId: s2.id,
        unitName: "X",
        slotCount: 1,
      });
      const ok = await reorderSubjectUnitsImpl(db, {
        subjectId: s1.id,
        orderedUnitIds: [a.id, foreign.id],
      });
      expect(ok).toBe(false);
      // ensure orders untouched
      const still = await db.subjectUnit.findUnique({ where: { id: a.id } });
      expect(still?.order).toBe(1);
    });
  });
});
