"use server"

import { revalidatePath } from "next/cache"

import { prisma } from "@/lib/prisma/prisma"

export type CreateTermState = {
  status: "idle" | "error" | "success"
  message?: string
}

export async function createTerm(
  _prevState: CreateTermState,
  formData: FormData
): Promise<CreateTermState> {
  const name = String(formData.get("name") ?? "").trim()
  const startsAtRaw = String(formData.get("startsAt") ?? "")
  const endsAtRaw = String(formData.get("endsAt") ?? "")

  if (!name || !startsAtRaw || !endsAtRaw) {
    return { status: "error", message: "入力内容を確認してください。" }
  }

  const startsAt = new Date(startsAtRaw)
  const endsAt = new Date(endsAtRaw)

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { status: "error", message: "日付の形式が正しくありません。" }
  }

  if (endsAt < startsAt) {
    return { status: "error", message: "終了日は開始日以降にしてください。" }
  }

  try {
    await prisma.term.create({
      data: {
        name,
        startsAt,
        endsAt,
      },
    })
  } catch {
    return { status: "error", message: "作成に失敗しました。" }
  }

  revalidatePath("/terms")
  return { status: "success" }
}
