"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma/prisma";

export async function saveRequiredLessonCount(formData: FormData) {
  const termId = String(formData.get("termId") ?? "");
  const subjectId = String(formData.get("subjectId") ?? "");
  const requiredCountValue = Number(formData.get("requiredCount") ?? 0);

  if (!termId || !subjectId) {
    return;
  }

  if (!Number.isInteger(requiredCountValue) || requiredCountValue < 0) {
    return;
  }

  await prisma.requiredLessonCount.upsert({
    where: {
      termId_subjectId: {
        termId,
        subjectId,
      },
    },
    update: {
      requiredCount: requiredCountValue,
    },
    create: {
      termId,
      subjectId,
      requiredCount: requiredCountValue,
    },
  });

  revalidatePath(`/terms/${termId}/requirements`);
}

export async function deleteRequiredLessonCount(formData: FormData) {
  const termId = String(formData.get("termId") ?? "");
  const subjectId = String(formData.get("subjectId") ?? "");

  if (!termId || !subjectId) {
    return;
  }

  await prisma.requiredLessonCount.delete({
    where: {
      termId_subjectId: {
        termId,
        subjectId,
      },
    },
  });

  revalidatePath(`/terms/${termId}/requirements`);
}


