import { createServerFn } from "@tanstack/react-start";
import { getDb } from "../db";

export const listSubjects = createServerFn({ method: "GET" }).handler(
  async () => {
    const db = getDb();
    const subjects = await db.subject.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: {
          select: { subjectUnits: true },
        },
      },
      orderBy: { name: "asc" },
    });
    return subjects.map((s) => ({
      id: s.id,
      name: s.name,
      createdAtIso: s.createdAt.toISOString(),
      unitCount: s._count.subjectUnits,
    }));
  },
);

export const createSubject = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string }) => {
    const name = String(data?.name ?? "").trim();
    if (!name) throw new Error("科目名を入力してください。");
    return { name };
  })
  .handler(async ({ data }) => {
    const db = getDb();
    await db.subject.create({ data: { name: data.name } });
  });

export const updateSubject = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; name: string }) => {
    const id = String(data?.id ?? "");
    const name = String(data?.name ?? "").trim();
    if (!id || !name) throw new Error("入力内容を確認してください。");
    return { id, name };
  })
  .handler(async ({ data }) => {
    const db = getDb();
    await db.subject.update({ where: { id: data.id }, data: { name: data.name } });
  });

export const deleteSubject = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => {
    const id = String(data?.id ?? "");
    if (!id) throw new Error("IDが必要です。");
    return { id };
  })
  .handler(async ({ data }) => {
    const db = getDb();
    await db.subject.delete({ where: { id: data.id } });
  });
