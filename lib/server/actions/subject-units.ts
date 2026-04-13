import { createServerFn } from "@tanstack/react-start";
import { getDb } from "@/lib/server/db";

export const getSubjectWithUnits = createServerFn({ method: "GET" })
  .inputValidator((data: { subjectId: string }) => {
    const subjectId = String(data?.subjectId ?? "");
    if (!subjectId) throw new Error("subjectId is required");
    return { subjectId };
  })
  .handler(async ({ data }) => {
    const db = getDb();
    return db.subject.findUnique({
      where: { id: data.subjectId },
      select: {
        id: true,
        name: true,
        subjectUnits: {
          select: {
            id: true,
            unitName: true,
            slotCount: true,
            order: true,
          },
          orderBy: { order: "asc" },
        },
      },
    });
  });

export const createSubjectUnit = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { subjectId: string; unitName: string; slotCount: number }) => {
      const subjectId = String(data?.subjectId ?? "");
      const unitName = String(data?.unitName ?? "").trim();
      const slotCount = Number(data?.slotCount ?? 0);
      if (!subjectId || !unitName) {
        throw new Error("入力内容を確認してください。");
      }
      if (!Number.isInteger(slotCount) || slotCount <= 0) {
        throw new Error("コマ数は1以上で入力してください。");
      }
      return { subjectId, unitName, slotCount };
    },
  )
  .handler(async ({ data }) => {
    const db = getDb();
    await db.$transaction(async (tx) => {
      const max = await tx.subjectUnit.aggregate({
        where: { subjectId: data.subjectId },
        _max: { order: true },
      });
      const nextOrder = (max._max.order ?? 0) + 1;
      await tx.subjectUnit.create({
        data: {
          subjectId: data.subjectId,
          unitName: data.unitName,
          slotCount: data.slotCount,
          order: nextOrder,
        },
      });
    });
  });

export const updateSubjectUnit = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      subjectId: string;
      unitName: string;
      slotCount: number;
    }) => {
      const id = String(data?.id ?? "");
      const subjectId = String(data?.subjectId ?? "");
      const unitName = String(data?.unitName ?? "").trim();
      const slotCount = Number(data?.slotCount ?? 0);
      if (!id || !subjectId || !unitName) {
        throw new Error("入力内容を確認してください。");
      }
      if (!Number.isInteger(slotCount) || slotCount <= 0) {
        throw new Error("コマ数は1以上で入力してください。");
      }
      return { id, subjectId, unitName, slotCount };
    },
  )
  .handler(async ({ data }) => {
    const db = getDb();
    const unit = await db.subjectUnit.findUnique({
      where: { id: data.id },
      select: { subjectId: true },
    });
    if (!unit || unit.subjectId !== data.subjectId) return;
    await db.subjectUnit.update({
      where: { id: data.id },
      data: { unitName: data.unitName, slotCount: data.slotCount },
    });
  });

export const deleteSubjectUnit = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; subjectId: string }) => {
    const id = String(data?.id ?? "");
    const subjectId = String(data?.subjectId ?? "");
    if (!id || !subjectId) throw new Error("ID required");
    return { id, subjectId };
  })
  .handler(async ({ data }) => {
    const db = getDb();
    await db.$transaction(async (tx) => {
      const unit = await tx.subjectUnit.findUnique({
        where: { id: data.id },
        select: { subjectId: true, order: true },
      });
      if (!unit || unit.subjectId !== data.subjectId) return;
      await tx.subjectUnit.delete({ where: { id: data.id } });
      await tx.subjectUnit.updateMany({
        where: { subjectId: data.subjectId, order: { gt: unit.order } },
        data: { order: { decrement: 1 } },
      });
    });
  });

export const reorderSubjectUnits = createServerFn({ method: "POST" })
  .inputValidator((data: { subjectId: string; orderedUnitIds: string[] }) => {
    const subjectId = String(data?.subjectId ?? "");
    const orderedUnitIds = (data?.orderedUnitIds ?? [])
      .map((v) => String(v))
      .filter(Boolean);
    if (!subjectId || orderedUnitIds.length === 0) {
      throw new Error("入力内容を確認してください。");
    }
    if (new Set(orderedUnitIds).size !== orderedUnitIds.length) {
      throw new Error("IDが重複しています。");
    }
    return { subjectId, orderedUnitIds };
  })
  .handler(async ({ data }) => {
    const db = getDb();
    await db.$transaction(async (tx) => {
      const existing = await tx.subjectUnit.findMany({
        where: { subjectId: data.subjectId },
        select: { id: true },
      });
      const existingIds = new Set(existing.map((u) => u.id));
      for (const id of data.orderedUnitIds) {
        if (!existingIds.has(id)) return;
      }
      await tx.subjectUnit.updateMany({
        where: { subjectId: data.subjectId },
        data: { order: { increment: 10000 } },
      });
      for (let i = 0; i < data.orderedUnitIds.length; i++) {
        await tx.subjectUnit.update({
          where: { id: data.orderedUnitIds[i] },
          data: { order: i + 1 },
        });
      }
    });
  });
