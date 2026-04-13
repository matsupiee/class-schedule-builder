import { createServerFn } from "@tanstack/react-start";
import { getDb } from "../db";

export const saveRequiredLessonCount = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { termId: string; subjectId: string; requiredCount: number }) => {
      const termId = String(data?.termId ?? "");
      const subjectId = String(data?.subjectId ?? "");
      const requiredCount = Number(data?.requiredCount ?? 0);
      if (!termId || !subjectId) throw new Error("termId, subjectId required");
      if (!Number.isInteger(requiredCount) || requiredCount < 0) {
        throw new Error("invalid requiredCount");
      }
      return { termId, subjectId, requiredCount };
    },
  )
  .handler(async ({ data }) => {
    const db = getDb();
    await db.requiredLessonCount.upsert({
      where: {
        termId_subjectId: { termId: data.termId, subjectId: data.subjectId },
      },
      update: { requiredCount: data.requiredCount },
      create: data,
    });
  });

export const deleteRequiredLessonCount = createServerFn({ method: "POST" })
  .inputValidator((data: { termId: string; subjectId: string }) => {
    const termId = String(data?.termId ?? "");
    const subjectId = String(data?.subjectId ?? "");
    if (!termId || !subjectId) throw new Error("termId, subjectId required");
    return { termId, subjectId };
  })
  .handler(async ({ data }) => {
    const db = getDb();
    await db.requiredLessonCount.delete({
      where: {
        termId_subjectId: { termId: data.termId, subjectId: data.subjectId },
      },
    });
  });
