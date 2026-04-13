import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GoogleCalendar } from "./google-calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCalendarDay,
  saveCalendarDay,
} from "@packages/api/actions/calendar";

const dayTypeOptions = [
  { value: "NORMAL", label: "通常日" },
  { value: "WEEKLY_OFF", label: "定期休み" },
  { value: "HOLIDAY", label: "祝日" },
  { value: "SCHOOL_EVENT", label: "学校行事" },
];

const slotCountOptions = [3, 4, 5, 6, 7, 8];

type TermCalendarClientProps = {
  startDate: string;
  endDate: string;
  termId: string;
  calendarDays?: Array<{ date: string; title: string | null; dayType: string }>;
};

export function TermCalendarClient({
  startDate,
  endDate,
  termId,
  calendarDays = [],
}: TermCalendarClientProps) {
  const router = useRouter();
  const startDateObj = useMemo(() => {
    const parsed = new Date(startDate);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [startDate]);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    startDateObj,
  );
  const [dayType, setDayType] = useState(dayTypeOptions[0]?.value ?? "NORMAL");
  const [slotCount, setSlotCount] = useState(6);
  const [title, setTitle] = useState("");
  const [disabledSlots, setDisabledSlots] = useState<Set<number>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);

  const slotList = useMemo(
    () => Array.from({ length: slotCount }, (_, i) => i + 1),
    [slotCount],
  );
  const selectedLabel = selectedDate
    ? selectedDate.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
      })
    : "日付を選択";

  const formatDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const toggleSlot = (slot: number) => {
    setDisabledSlots((prev) => {
      const next = new Set(prev);
      if (next.has(slot)) next.delete(slot);
      else next.add(slot);
      return next;
    });
  };

  const selectedDateValue = selectedDate ? formatDateKey(selectedDate) : "";

  useEffect(() => {
    if (!selectedDateValue) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getCalendarDay({
          data: { termId, date: selectedDateValue },
        });
        if (cancelled) return;
        if (!data) {
          setDayType(dayTypeOptions[0]?.value ?? "NORMAL");
          setSlotCount(6);
          setTitle("");
          setDisabledSlots(new Set());
          return;
        }
        setDayType(data.dayType);
        setSlotCount(data.slotCount);
        setTitle(data.title ?? "");
        setDisabledSlots(
          new Set(
            data.daySlots
              .filter((s) => s.disabledReason)
              .map((s) => s.daySlotIndex),
          ),
        );
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedDateValue, termId, refreshKey]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDateValue) return;
    setSaving(true);
    try {
      await saveCalendarDay({
        data: {
          termId,
          date: selectedDateValue,
          dayType,
          slotCount,
          title,
          disabledSlots: Array.from(disabledSlots),
        },
      });
      toast.success("保存されました");
      setRefreshKey((p) => p + 1);
      await router.invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

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
            <form onSubmit={handleSubmit} className="grid gap-5">
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
                  onValueChange={(v) => setSlotCount(Number(v))}
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
                    <span className="text-muted-foreground text-xs">
                      {slotCount} コマ中 {disabledSlots.size} コマ無効
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {slotList.map((slot) => {
                      const checked = !disabledSlots.has(slot);
                      return (
                        <label
                          key={slot}
                          className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                        >
                          <span>{slot} 限</span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs">
                              {checked ? "有効" : "無効"}
                            </span>
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleSlot(slot)}
                            />
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="day-title">行事名・備考</Label>
                <Input
                  id="day-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例: 始業式"
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={!selectedDateValue || saving}>
                  保存
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
