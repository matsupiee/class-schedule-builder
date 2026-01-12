"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma/prisma";

export type CreateSubjectUnitState = {
  status: "idle" | "error" | "success";
  message?: string;
};

function revalidateSubjectUnitPaths(subjectId: string) {
  // まだページが存在しない場合でも安全（存在するようになったら効く）
  revalidatePath("/subjects");
  if (subjectId) {
    revalidatePath(`/subjects/${subjectId}/units`);
  }
}

export async function createSubjectUnit(
  _prevState: CreateSubjectUnitState,
  formData: FormData
): Promise<CreateSubjectUnitState> {
  const subjectId = String(formData.get("subjectId") ?? "");
  const unitName = String(formData.get("unitName") ?? "").trim();
  const slotCountValue = Number(formData.get("slotCount") ?? 0);

  if (!subjectId || !unitName) {
    return { status: "error", message: "入力内容を確認してください。" };
  }

  if (!Number.isInteger(slotCountValue) || slotCountValue <= 0) {
    return { status: "error", message: "コマ数は1以上で入力してください。" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const maxOrder = await tx.subjectUnit.aggregate({
        where: { subjectId },
        _max: { order: true },
      });
      const nextOrder = (maxOrder._max.order ?? 0) + 1;

      await tx.subjectUnit.create({
        data: {
          subjectId,
          unitName,
          slotCount: slotCountValue,
          order: nextOrder,
        },
      });
    });
  } catch {
    return { status: "error", message: "作成に失敗しました。" };
  }

  revalidateSubjectUnitPaths(subjectId);
  return { status: "success" };
}

export async function updateSubjectUnit(formData: FormData) {
  const subjectId = String(formData.get("subjectId") ?? "");
  const id = String(formData.get("id") ?? "");
  const unitName = String(formData.get("unitName") ?? "").trim();
  const slotCountValue = Number(formData.get("slotCount") ?? 0);

  if (!subjectId || !id || !unitName) {
    return;
  }

  if (!Number.isInteger(slotCountValue) || slotCountValue <= 0) {
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const unit = await tx.subjectUnit.findUnique({
        where: { id },
        select: { subjectId: true },
      });
      if (!unit || unit.subjectId !== subjectId) {
        return;
      }

      await tx.subjectUnit.update({
        where: { id },
        data: {
          unitName,
          slotCount: slotCountValue,
        },
      });
    });
  } catch {
    return;
  }

  revalidateSubjectUnitPaths(subjectId);
}

export async function deleteSubjectUnit(formData: FormData) {
  const subjectId = String(formData.get("subjectId") ?? "");
  const id = String(formData.get("id") ?? "");

  if (!subjectId || !id) {
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const unit = await tx.subjectUnit.findUnique({
        where: { id },
        select: { subjectId: true, order: true },
      });
      if (!unit || unit.subjectId !== subjectId) {
        return;
      }

      await tx.subjectUnit.delete({ where: { id } });

      // 削除された単元より後ろの order を詰める
      await tx.subjectUnit.updateMany({
        where: {
          subjectId,
          order: { gt: unit.order },
        },
        data: {
          order: { decrement: 1 },
        },
      });
    });
  } catch {
    return;
  }

  revalidateSubjectUnitPaths(subjectId);
}

export async function reorderSubjectUnits(formData: FormData) {
  const subjectId = String(formData.get("subjectId") ?? "");
  const orderedUnitIds = formData
    .getAll("unitIds")
    .map((value) => String(value))
    .filter(Boolean);

  if (!subjectId || orderedUnitIds.length === 0) {
    return;
  }

  // 重複チェック
  const unique = new Set(orderedUnitIds);
  if (unique.size !== orderedUnitIds.length) {
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.subjectUnit.findMany({
        where: { subjectId },
        select: { id: true },
      });

      // 入力のIDがすべてこの科目の単元であることを保証
      const existingIdSet = new Set(existing.map((u) => u.id));
      for (const id of orderedUnitIds) {
        if (!existingIdSet.has(id)) {
          return;
        }
      }

      // Unique制約（subjectId, order）衝突回避のため一度退避
      await tx.subjectUnit.updateMany({
        where: { subjectId },
        data: { order: { increment: 10000 } },
      });

      for (let i = 0; i < orderedUnitIds.length; i++) {
        await tx.subjectUnit.update({
          where: { id: orderedUnitIds[i] },
          data: { order: i + 1 },
        });
      }
    });
  } catch {
    return;
  }

  revalidateSubjectUnitPaths(subjectId);
}

