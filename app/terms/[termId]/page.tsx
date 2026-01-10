import Link from "next/link"
import { notFound } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { prisma } from "@/lib/prisma/prisma"

function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function calculateWeeks(start: Date, end: Date) {
  const msInDay = 24 * 60 * 60 * 1000
  const days = Math.floor((end.getTime() - start.getTime()) / msInDay) + 1
  return Math.ceil(days / 7)
}

type PageProps = {
  params: Promise<{ termId: string }>
}

export default async function TermDashboardPage({ params }: PageProps) {
  const { termId } = await params
  const term = await prisma.term.findUnique({
    where: { id: termId },
  })

  if (!term) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-muted/30 px-6 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div>
          <p className="text-muted-foreground text-sm">学期ダッシュボード</p>
          <h1 className="text-2xl font-semibold tracking-tight">{term.name}</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>学期情報</CardTitle>
              <CardDescription>期間と授業週数の確認。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">期間</span>
                <span>
                  {formatDate(term.startsAt)} 〜 {formatDate(term.endsAt)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">授業週数</span>
                <span>{calculateWeeks(term.startsAt, term.endsAt)} 週</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>設定進捗</CardTitle>
              <CardDescription>次にやることを確認。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span>授業日カレンダー</span>
                <span className="text-muted-foreground">未設定</span>
              </div>
              <div className="flex items-center justify-between">
                <span>法定授業数</span>
                <span className="text-muted-foreground">未設定</span>
              </div>
              <div className="flex items-center justify-between">
                <span>固定時間割</span>
                <span className="text-muted-foreground">未設定</span>
              </div>
              <div className="flex items-center justify-between">
                <span>時間割作成</span>
                <span className="text-muted-foreground">未作成</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>設定へ進む</CardTitle>
            <CardDescription>順番に設定していきます。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href={`/terms/${term.id}/calendar`}>授業日カレンダー</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/terms/${term.id}/requirements`}>法定授業数</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/terms/${term.id}/fixed-timetable`}>固定時間割</Link>
            </Button>
            <Button asChild>
              <Link href={`/terms/${term.id}/timetables`}>時間割作成</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
