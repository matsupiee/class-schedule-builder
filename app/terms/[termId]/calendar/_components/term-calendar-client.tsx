"use client"

import { useActionState, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { GoogleCalendar } from "./google-calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  saveCalendarDay,
  type SaveCalendarDayState,
} from "../actions"

const dayTypeOptions = [
  { value: "NORMAL", label: "通常日" },
  { value: "WEEKLY_OFF", label: "定期休み" },
  { value: "HOLIDAY", label: "祝日" },
  { value: "SCHOOL_EVENT", label: "学校行事" },
]

const slotCountOptions = [3, 4, 5, 6, 7, 8]

type TermCalendarClientProps = {
  startDate: string
  endDate: string
  termId: string
  calendarDays?: Array<{ date: string; title: string | null; dayType: string }>
}

export function TermCalendarClient({
  startDate,
  endDate,
  termId,
  calendarDays = [],
}: TermCalendarClientProps) {
  const startDateObj = useMemo(() => {
    const parsed = new Date(startDate)
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed
  }, [startDate])

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    startDateObj
  )
  const [dayType, setDayType] = useState(dayTypeOptions[0]?.value ?? "NORMAL")
  const [slotCount, setSlotCount] = useState(6)
  const [title, setTitle] = useState("")
  const [disabledSlots, setDisabledSlots] = useState<Set<number>>(new Set())
  const [refreshKey, setRefreshKey] = useState(0)

  const initialState: SaveCalendarDayState = {
    status: "idle",
  }
  const [state, formAction] = useActionState(saveCalendarDay, initialState)

  const slotList = useMemo(
    () => Array.from({ length: slotCount }, (_, index) => index + 1),
    [slotCount]
  )
  const selectedLabel = selectedDate
    ? selectedDate.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
      })
    : "日付を選択"

  const formatDateKey = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const toggleSlot = (slot: number) => {
    setDisabledSlots((prev) => {
      const next = new Set(prev)
      if (next.has(slot)) {
        next.delete(slot)
      } else {
        next.add(slot)
      }
      return next
    })
  }

  const selectedDateValue = selectedDate ? formatDateKey(selectedDate) : ""

  useEffect(() => {
    if (!selectedDateValue) {
      return
    }

    let cancelled = false

    const loadDay = async () => {
      const response = await fetch(
        `/terms/${termId}/calendar/day?date=${selectedDateValue}`
      )
      if (!response.ok) {
        return
      }
      const payload = (await response.json()) as {
        data: null | {
          dayType: string
          slotCount: number
          title: string | null
          daySlots: Array<{ daySlotIndex: number; disabledReason: string | null }>
        }
      }
      if (cancelled) {
        return
      }

      if (!payload.data) {
        setDayType(dayTypeOptions[0]?.value ?? "NORMAL")
        setSlotCount(6)
        setTitle("")
        setDisabledSlots(new Set())
        return
      }

      setDayType(payload.data.dayType)
      setSlotCount(payload.data.slotCount)
      setTitle(payload.data.title ?? "")
      setDisabledSlots(
        new Set(
          payload.data.daySlots
            .filter((slot) => slot.disabledReason)
            .map((slot) => slot.daySlotIndex)
        )
      )
    }

    loadDay()

    return () => {
      cancelled = true
    }
  }, [selectedDateValue, termId, refreshKey])

  // 保存成功時にデータを再取得
  useEffect(() => {
    if (state.status === "success") {
      toast.success("保存されました")
      // 次のレンダリングサイクルで更新
      const timer = setTimeout(() => {
        setRefreshKey((prev) => prev + 1)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [state.status])

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>月表示カレンダー</CardTitle>
            <CardDescription>日付を選択して設定します。</CardDescription>
          </CardHeader>
          <CardContent>
            <GoogleCalendar
              startDate={startDate}
              endDate={endDate}
              calendarDays={calendarDays}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>選択日の設定</CardTitle>
            <CardDescription>{selectedLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="grid gap-5">
              <input type="hidden" name="termId" value={termId} />
              <input type="hidden" name="date" value={selectedDateValue} />
              <input type="hidden" name="dayType" value={dayType} />
              <input type="hidden" name="slotCount" value={slotCount} />
              {Array.from(disabledSlots).map((slot) => (
                <input
                  key={slot}
                  type="hidden"
                  name="disabledSlots"
                  value={slot}
                />
              ))}
              <div className="grid gap-2">
                <Label>日種別</Label>
                <Select value={dayType} onValueChange={setDayType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="日種別を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {dayTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>授業コマ数</Label>
                <Select
                  value={String(slotCount)}
                  onValueChange={(value) => setSlotCount(Number(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="コマ数を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {slotCountOptions.map((count) => (
                      <SelectItem key={count} value={String(count)}>
                        {count} コマ
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {dayType !== "HOLIDAY" && (
                <div className="grid gap-3">
                  <div className="flex items-center justify-between">
                    <Label>個別コマの無効化</Label>
                    <span className="text-xs text-muted-foreground">
                      {slotCount} コマ中 {disabledSlots.size} コマ無効
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {slotList.map((slot) => {
                      const checked = !disabledSlots.has(slot)
                      return (
                        <label
                          key={slot}
                          className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                        >
                          <span>{slot} 限</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {checked ? "有効" : "無効"}
                            </span>
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleSlot(slot)}
                            />
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="day-title">行事名・備考</Label>
                <Input
                  id="day-title"
                  name="title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="例: 始業式"
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={!selectedDateValue}>
                  保存
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
