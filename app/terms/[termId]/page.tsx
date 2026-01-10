import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeftIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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

  // 設定進捗の確認
  const calendarDaysCount = await prisma.calendarDay.count({
    where: { termId },
  })

  const requiredLessonCountsCount = await prisma.requiredLessonCount.count({
    where: { termId },
  })

  const fixedTimetableSlotsCount = await prisma.fixedTimetableSlot.count({
    where: { termId },
  })

  const timetablePlansCount = await prisma.timetablePlan.count({
    where: { termId },
  })

  // 最新の時間割プランを1つ取得
  const latestTimetablePlan = await prisma.timetablePlan.findFirst({
    where: { termId },
    orderBy: { createdAt: "desc" },
    include: {
      timetablePlanSlots: {
        include: {
          subject: true,
        },
      },
    },
  })

  // 週次ルールを取得して、各曜日の最大コマ数を計算
  const weeklyDayRules = await prisma.weeklyDayRule.findMany({
    where: { termId },
  })

  const weekdaySlotCounts: Record<number, number> = {}
  for (const rule of weeklyDayRules) {
    weekdaySlotCounts[rule.weekday] = rule.defaultSlotCount
  }

  const maxSlotCount = Math.max(...Object.values(weekdaySlotCounts), 0)

  // 時間割スロットをマップに変換
  const slotsMap = new Map<string, { subjectId: string | null; subject: { id: string; name: string } | null }>()
  if (latestTimetablePlan) {
    for (const slot of latestTimetablePlan.timetablePlanSlots) {
      const key = `${slot.weekday}-${slot.daySlotIndex}`
      slotsMap.set(key, {
        subjectId: slot.subjectId,
        subject: slot.subject,
      })
    }
  }

  const weekdays = [
    { value: 1, label: "月" },
    { value: 2, label: "火" },
    { value: 3, label: "水" },
    { value: 4, label: "木" },
    { value: 5, label: "金" },
  ] as const

  return (
    <main className="min-h-screen bg-muted/30 px-6 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/terms">
              <ChevronLeftIcon className="h-5 w-5" />
              <span className="sr-only">学期一覧へ戻る</span>
            </Link>
          </Button>
          <div className="flex-1">
            <p className="text-muted-foreground text-sm">学期ダッシュボード</p>
            <h1 className="text-2xl font-semibold tracking-tight">{term.name}</h1>
          </div>
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
                {calendarDaysCount > 0 ? (
                  <span className="text-green-600 font-medium">設定済み</span>
                ) : (
                  <span className="text-muted-foreground">未設定</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span>法定授業数</span>
                {requiredLessonCountsCount > 0 ? (
                  <span className="text-green-600 font-medium">
                    設定済み ({requiredLessonCountsCount}科目)
                  </span>
                ) : (
                  <span className="text-muted-foreground">未設定</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span>固定時間割</span>
                {fixedTimetableSlotsCount > 0 ? (
                  <span className="text-green-600 font-medium">
                    設定済み ({fixedTimetableSlotsCount}コマ)
                  </span>
                ) : (
                  <span className="text-muted-foreground">未設定</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span>時間割作成</span>
                {timetablePlansCount > 0 ? (
                  <span className="text-green-600 font-medium">
                    作成済み ({timetablePlansCount}件)
                  </span>
                ) : (
                  <span className="text-muted-foreground">未作成</span>
                )}
              </div>

              <div className="mt-6 pt-6 border-t">
                <Button asChild className="w-full">
                  <Link href={`/terms/${term.id}/settings`}>設定を開く</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {latestTimetablePlan && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>最新の時間割</CardTitle>
                  <CardDescription>
                    {latestTimetablePlan.name} -{" "}
                    {latestTimetablePlan.createdAt.toLocaleDateString("ja-JP")}
                  </CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/terms/${term.id}/timetables/${latestTimetablePlan.id}`}>
                    編集
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {maxSlotCount > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">コマ</TableHead>
                        {weekdays.map((weekday) => (
                          <TableHead key={weekday.value}>{weekday.label}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: maxSlotCount }, (_, index) => {
                        const slot = index + 1
                        return (
                          <TableRow key={slot}>
                            <TableCell className="font-medium">{slot} 限</TableCell>
                            {weekdays.map((weekday) => {
                              const key = `${weekday.value}-${slot}`
                              const slotData = slotsMap.get(key)
                              const isDisabled =
                                weekdaySlotCounts[weekday.value] === undefined ||
                                slot > weekdaySlotCounts[weekday.value]
                              const isSet = slotData && slotData.subject !== null

                              return (
                                <TableCell
                                  key={`${weekday.value}-${slot}`}
                                  className={
                                    isDisabled
                                      ? "bg-muted/20"
                                      : isSet
                                        ? "bg-muted/30"
                                        : ""
                                  }
                                >
                                  {isDisabled ? (
                                    <span className="text-muted-foreground text-xs">-</span>
                                  ) : isSet ? (
                                    <span className="font-medium text-sm">
                                      {slotData?.subject?.name}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">
                                      未設定
                                    </span>
                                  )}
                                </TableCell>
                              )
                            })}
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  まだスロットが設定されていません
                </div>
              )}
              <div className="mt-4">
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/terms/${term.id}/timetables`}>
                    時間割一覧を見る
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
