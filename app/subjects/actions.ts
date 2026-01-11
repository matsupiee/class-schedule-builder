"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma/prisma";

export type CreateSubjectState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export async function createSubject(
  _prevState: CreateSubjectState,
  formData: FormData
): Promise<CreateSubjectState> {
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return { status: "error", message: "科目名を入力してください。" };
  }

  try {
    await prisma.subject.create({
      data: {
        name,
      },
    });
  } catch (error: unknown) {
    return { status: "error", message: "作成に失敗しました。" };
  }

  revalidatePath("/subjects");
  // 設定ページも再検証（動的パスは直接指定できないため、"/subjects"の再検証で十分）
  return { status: "success" };
}

export async function updateSubject(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!id || !name) {
    return;
  }

  try {
    await prisma.subject.update({
      where: { id },
      data: {
        name,
      },
    });
  } catch {
    return;
  }

  revalidatePath("/subjects");
}

export async function deleteSubject(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    return;
  }

  try {
    await prisma.subject.delete({
      where: { id },
    });
  } catch {
    return;
  }

  revalidatePath("/subjects");
}

