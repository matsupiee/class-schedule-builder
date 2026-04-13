import { createServerFn } from "@tanstack/react-start";
import { getDb } from "../db";
import type { AppPrismaClient } from "@packages/db";

export async function getSubjectWithUnitsImpl(
  db: AppPrismaClient,
  data: { subjectId: string },
) {
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
}

export const getSubjectWithUnits = createServerFn({ method: "GET" })
  .inputValidator((data: { subjectId: string }) => {
    const subjectId = String(data?.subjectId ?? "");
    if (!subjectId) throw new Error("subjectId is required");
    return { subjectId };
  })
  .handler(async ({ data }) => {
    return getSubjectWithUnitsImpl(getDb(), data);
  });

export async function createSubjectUnitImpl(
  db: AppPrismaClient,
  data: { subjectId: string; unitName: string; slotCount: number },
) {
  const max = await db.subjectUnit.aggregate({
    where: { subjectId: data.subjectId },
    _max: { order: true },
  });
  const nextOrder = (max._max.order ?? 0) + 1;
  return db.subjectUnit.create({
    data: {
      subjectId: data.subjectId,
      unitName: data.unitName,
      slotCount: data.slotCount,
      order: nextOrder,
    },
  });
}

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
    await createSubjectUnitImpl(getDb(), data);
  });

export async function updateSubjectUnitImpl(
  db: AppPrismaClient,
  data: {
    id: string;
    subjectId: string;
    unitName: string;
    slotCount: number;
  },
) {
  const unit = await db.subjectUnit.findUnique({
    where: { id: data.id },
    select: { subjectId: true },
  });
  if (!unit || unit.subjectId !== data.subjectId) return false;
  await db.subjectUnit.update({
    where: { id: data.id },
    data: { unitName: data.unitName, slotCount: data.slotCount },
  });
  return true;
}

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
    await updateSubjectUnitImpl(getDb(), data);
  });

export async function deleteSubjectUnitImpl(
  db: AppPrismaClient,
  data: { id: string; subjectId: string },
) {
  const unit = await db.subjectUnit.findUnique({
    where: { id: data.id },
    select: { subjectId: true, order: true },
  });
  if (!unit || unit.subjectId !== data.subjectId) return false;
  await db.$transaction([
    db.subjectUnit.delete({ where: { id: data.id } }),
    db.subjectUnit.updateMany({
      where: { subjectId: data.subjectId, order: { gt: unit.order } },
      data: { order: { decrement: 1 } },
    }),
  ]);
  return true;
}

export const deleteSubjectUnit = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; subjectId: string }) => {
    const id = String(data?.id ?? "");
    const subjectId = String(data?.subjectId ?? "");
    if (!id || !subjectId) throw new Error("ID required");
    return { id, subjectId };
  })
  .handler(async ({ data }) => {
    await deleteSubjectUnitImpl(getDb(), data);
  });

export async function reorderSubjectUnitsImpl(
  db: AppPrismaClient,
  data: { subjectId: string; orderedUnitIds: string[] },
) {
  const existing = await db.subjectUnit.findMany({
    where: { subjectId: data.subjectId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((u) => u.id));
  for (const id of data.orderedUnitIds) {
    if (!existingIds.has(id)) return false;
  }
  await db.$transaction([
    db.subjectUnit.updateMany({
      where: { subjectId: data.subjectId },
      data: { order: { increment: 10000 } },
    }),
    ...data.orderedUnitIds.map((id, i) =>
      db.subjectUnit.update({
        where: { id },
        data: { order: i + 1 },
      }),
    ),
  ]);
  return true;
}

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
    await reorderSubjectUnitsImpl(getDb(), data);
  });
