"use client"

import { useMemo, useState } from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type GoogleCalendarProps = {
  startDate: string
  endDate: string
  calendarDays?: Array<{ date: string; title: string | null; dayType: string }>
  selectedDate?: Date
  onSelectDate?: (date: Date) => void
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"]

export function GoogleCalendar({
  startDate,
  endDate,
  calendarDays = [],
  selectedDate,
  onSelectDate,
}: GoogleCalendarProps) {
  const startDateObj = useMemo(() => {
    const parsed = new Date(startDate)
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed
  }, [startDate])
  const endDateObj = useMemo(() => {
    const parsed = new Date(endDate)
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed
  }, [endDate])

  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date()
    if (today >= startDateObj && today <= endDateObj) {
      return new Date(today.getFullYear(), today.getMonth(), 1)
    }
    return new Date(startDateObj.getFullYear(), startDateObj.getMonth(), 1)
  })

  // カレンダー日のタイトルを取得するためのMap
  const calendarDaysMap = useMemo(() => {
    const map = new Map<string, { title: string | null; dayType: string }>()
    for (const day of calendarDays) {
      const dateKey = day.date.slice(0, 10) // YYYY-MM-DD形式
      map.set(dateKey, { title: day.title, dayType: day.dayType })
    }
    return map
  }, [calendarDays])

  // 日付をYYYY-MM-DD形式に変換
  const formatDateKey = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  // 2つの日付が同じ日かどうか
  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    )
  }

  // 今日かどうか
  const isToday = (date: Date) => {
    const today = new Date()
    return isSameDay(date, today)
  }

  // 月のカレンダーグリッドを生成
  const calendarGrid = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()

    // 月の最初の日
    const firstDay = new Date(year, month, 1)
    // 月の最後の日
    const lastDay = new Date(year, month + 1, 0)

    // 最初の日の曜日（0=日曜日）
    const firstDayOfWeek = firstDay.getDay()

    // グリッドの日付配列
    const days: Array<Date | null> = []

    // 前月の日付を追加
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i)
      days.push(date)
    }

    // 今月の日付を追加
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day))
    }

    // 次月の日付を追加（6週分のグリッドにするため）
    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      days.push(new Date(year, month + 1, day))
    }

    return days
  }, [currentMonth])

  // 前の月へ
  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
      // 学期の開始日より前には行かない
      if (newMonth < startDateObj) {
        return new Date(startDateObj.getFullYear(), startDateObj.getMonth(), 1)
      }
      return newMonth
    })
  }

  // 次の月へ
  const goToNextMonth = () => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
      // 学期の終了日より後には行かない
      if (newMonth > endDateObj) {
        return new Date(endDateObj.getFullYear(), endDateObj.getMonth(), 1)
      }
      return newMonth
    })
  }

  // 今日に戻る
  const goToToday = () => {
    const today = new Date()
    if (today >= startDateObj && today <= endDateObj) {
      setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))
    } else {
      setCurrentMonth(new Date(startDateObj.getFullYear(), startDateObj.getMonth(), 1))
    }
  }

  // 日付が学期の範囲内かどうか
  const isInTermRange = (date: Date) => {
    return date >= startDateObj && date <= endDateObj
  }

  // 日付が現在の月かどうか
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth()
  }

  const monthYearLabel = `${currentMonth.getFullYear()}年${currentMonth.getMonth() + 1}月`

  return (
    <div className="w-full">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
            className="text-sm"
          >
            今日
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPreviousMonth}
              disabled={
                new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1) <
                new Date(startDateObj.getFullYear(), startDateObj.getMonth(), 1)
              }
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextMonth}
              disabled={
                new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1) >
                new Date(endDateObj.getFullYear(), endDateObj.getMonth(), 1)
              }
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-lg font-medium">{monthYearLabel}</div>
        </div>
      </div>

      {/* カレンダーグリッド */}
      <div className="border rounded-lg overflow-hidden">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="p-2 text-center text-sm font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* 日付グリッド */}
        <div className="grid grid-cols-7">
          {calendarGrid.map((date, index) => {
            if (!date) return null

            const dateKey = formatDateKey(date)
            const dayData = calendarDaysMap.get(dateKey)
            const title = dayData?.title
            const dayType = dayData?.dayType
            const isSelected = selectedDate && isSameDay(date, selectedDate)
            const isTodayDate = isToday(date)
            const inRange = isInTermRange(date)
            const inCurrentMonth = isCurrentMonth(date)

            // dayTypeに応じた背景色
            const getDayTypeColor = () => {
              switch (dayType) {
                case "WEEKLY_OFF":
                  return "bg-slate-100 text-slate-700"
                case "HOLIDAY":
                  return "bg-amber-100 text-amber-900"
                case "SCHOOL_EVENT":
                  return "bg-rose-100 text-rose-900"
                default:
                  return ""
              }
            }

            return (
              <button
                key={index}
                type="button"
                onClick={() => {
                  if (inRange && onSelectDate) {
                    onSelectDate(date)
                  }
                }}
                disabled={!inRange}
                className={cn(
                  "relative min-h-[80px] p-2 text-left border-r border-b last:border-r-0 transition-colors",
                  "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                  "flex flex-col items-start",
                  !inCurrentMonth && "bg-muted/30",
                  !inRange && "opacity-50 cursor-not-allowed",
                  isSelected && "bg-primary/10"
                )}
              >
                {/* 日付番号 - 上部に固定 */}
                <div
                  className={cn(
                    "flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium mb-1 flex-shrink-0",
                    isSelected && "bg-primary text-primary-foreground",
                    !isSelected && isTodayDate && "bg-accent text-accent-foreground",
                    !isSelected && !isTodayDate && "text-foreground"
                  )}
                >
                  {date.getDate()}
                </div>

                {/* タイトル - 日付の下に表示 */}
                {title && (
                  <div
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded truncate w-full",
                      dayType ? getDayTypeColor() : "bg-green-100 text-green-900"
                    )}
                  >
                    {title}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
