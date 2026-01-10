import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeftIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { prisma } from "@/lib/prisma/prisma"

import { TermCalendarClient } from "@/app/terms/[termId]/calendar/_components/term-calendar-client"

type PageProps = {
  params: Promise<{ termId: string }>
}

export default async function TermCalendarPage({ params }: PageProps) {
  const { termId } = await params
  const term = await prisma.term.findUnique({
    where: { id: termId },
  })
  const holidayDays = await prisma.calendarDay.findMany({
    where: { termId, dayType: "HOLIDAY" },
    orderBy: { date: "asc" },
    select: { date: true, title: true },
  })

  if (!term) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-muted/30 px-6 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/terms/${term.id}`}>
              <ChevronLeftIcon className="h-5 w-5" />
              <span className="sr-only">ダッシュボードへ戻る</span>
            </Link>
          </Button>
          <div className="flex-1">
            <p className="text-muted-foreground text-sm">授業日カレンダー</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {term.name}
            </h1>
          </div>
        </div>

        <TermCalendarClient
          startDate={term.startsAt.toISOString()}
          endDate={term.endsAt.toISOString()}
          termId={term.id}
          holidays={holidayDays.map((holiday) => ({
            date: holiday.date.toISOString(),
            title: holiday.title ?? "祝日",
          }))}
        />
      </div>
    </main>
  )
}
