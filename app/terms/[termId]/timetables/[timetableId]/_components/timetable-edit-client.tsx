"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  deleteTimetablePlanSlot,
  saveTimetablePlanSlot,
} from "../actions";

const weekdays = [
  { value: 1, label: "月" },
  { value: 2, label: "火" },
  { value: 3, label: "水" },
  { value: 4, label: "木" },
  { value: 5, label: "金" },
] as const;

type Subject = {
  id: string;
  name: string;
};

type TimetablePlanSlot = {
  weekday: number;
  daySlotIndex: number;
  subjectId: string | null;
  subject: Subject | null;
};

type TimetableEditClientProps = {
  timetablePlanId: string;
  subjects: Subject[];
  timetablePlanSlots: TimetablePlanSlot[];
  weekdaySlotCounts: Record<number, number>;
  weekdayOccurrences: Record<number, number>;
};

export function TimetableEditClient({
  timetablePlanId,
  subjects,
  timetablePlanSlots,
  weekdaySlotCounts,
  weekdayOccurrences,
}: TimetableEditClientProps) {
  const [selectedWeekday, setSelectedWeekday] = useState<number | null>(null);
  const [selectedDaySlotIndex, setSelectedDaySlotIndex] = useState<number | null>(
    null
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

  const slotsMap = useMemo(() => {
    const map = new Map<string, TimetablePlanSlot>();
    for (const slot of timetablePlanSlots) {
      const key = `${slot.weekday}-${slot.daySlotIndex}`;
      map.set(key, slot);
    }
    return map;
  }, [timetablePlanSlots]);

  const maxSlotCount = useMemo(() => {
    return Math.max(...Object.values(weekdaySlotCounts), 0);
  }, [weekdaySlotCounts]);

  const slots = useMemo(() => {
    return Array.from({ length: maxSlotCount }, (_, index) => index + 1);
  }, [maxSlotCount]);

  const handleCellClick = (weekday: number, daySlotIndex: number) => {
    const key = `${weekday}-${daySlotIndex}`;
    const existingSlot = slotsMap.get(key);

    setSelectedWeekday(weekday);
    setSelectedDaySlotIndex(daySlotIndex);
    setSelectedSubjectId(existingSlot?.subjectId ?? "");
  };

  const handleSave = async () => {
    if (selectedWeekday === null || selectedDaySlotIndex === null) {
      return;
    }

    if (!selectedSubjectId) {
      return;
    }

    const formData = new FormData();
    formData.append("timetablePlanId", timetablePlanId);
    formData.append("weekday", String(selectedWeekday));
    formData.append("daySlotIndex", String(selectedDaySlotIndex));
    formData.append("subjectId", selectedSubjectId);
    await saveTimetablePlanSlot(formData);

    // リセット
    setSelectedWeekday(null);
    setSelectedDaySlotIndex(null);
    setSelectedSubjectId("");
  };

  const handleDelete = async () => {
    if (selectedWeekday === null || selectedDaySlotIndex === null) {
      return;
    }

    const formData = new FormData();
    formData.append("timetablePlanId", timetablePlanId);
    formData.append("weekday", String(selectedWeekday));
    formData.append("daySlotIndex", String(selectedDaySlotIndex));
    await deleteTimetablePlanSlot(formData);

    // リセット
    setSelectedWeekday(null);
    setSelectedDaySlotIndex(null);
    setSelectedSubjectId("");
  };

  const handleCancel = () => {
    setSelectedWeekday(null);
    setSelectedDaySlotIndex(null);
    setSelectedSubjectId("");
  };

  const getSlotSubject = (weekday: number, daySlotIndex: number) => {
    const key = `${weekday}-${daySlotIndex}`;
    return slotsMap.get(key);
  };

  // 各科目の消化コマ数を計算
  const subjectSlotCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const slot of timetablePlanSlots) {
      if (slot.subjectId && slot.subject) {
        const occurrences = weekdayOccurrences[slot.weekday] ?? 0;
        const current = counts.get(slot.subjectId) ?? 0;
        counts.set(slot.subjectId, current + occurrences);
      }
    }

    return counts;
  }, [timetablePlanSlots, weekdayOccurrences]);

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
      <Card>
        <CardHeader>
          <CardTitle>週次グリッド</CardTitle>
          <CardDescription>
            曜日とコマごとの授業を設定します。セルをクリックして設定してください。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
              {slots.map((slot) => (
                <TableRow key={slot}>
                  <TableCell className="font-medium">{slot} 限</TableCell>
                  {weekdays.map((weekday) => {
                    const slotSubject = getSlotSubject(weekday.value, slot);
                    const isSelected =
                      selectedWeekday === weekday.value &&
                      selectedDaySlotIndex === slot;
                    const isDisabled =
                      weekdaySlotCounts[weekday.value] === undefined ||
                      slot > weekdaySlotCounts[weekday.value];
                    const isSet = slotSubject && slotSubject.subject !== null;

                    return (
                      <TableCell
                        key={`${weekday.value}-${slot}`}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-accent"
                            : isSet
                              ? "bg-muted/30 hover:bg-muted/50"
                              : isDisabled
                                ? "bg-muted/20"
                                : "hover:bg-muted/30"
                        } ${isDisabled ? "cursor-not-allowed" : ""}`}
                        onClick={() => !isDisabled && handleCellClick(weekday.value, slot)}
                      >
                        {isDisabled ? (
                          <span className="text-muted-foreground text-xs">-</span>
                        ) : isSet ? (
                          <div className="flex items-center justify-center min-h-[32px]">
                            <span className="font-medium text-sm">
                              {slotSubject?.subject?.name}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center min-h-[32px]">
                            <span className="text-muted-foreground text-xs border border-dashed border-muted-foreground/30 rounded px-2 py-1">
                              未設定
                            </span>
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>授業の設定</CardTitle>
          <CardDescription>
            {selectedWeekday !== null && selectedDaySlotIndex !== null
              ? `${weekdays.find((w) => w.value === selectedWeekday)?.label}曜日 ${selectedDaySlotIndex}限の設定`
              : "セルを選択して設定します"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {selectedWeekday !== null && selectedDaySlotIndex !== null ? (
            <>
              <div className="grid gap-2">
                <label className="text-sm font-medium">科目</label>
                <Select
                  value={selectedSubjectId}
                  onValueChange={setSelectedSubjectId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="科目を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={!selectedSubjectId}
                  className="flex-1"
                >
                  保存
                </Button>
                {getSlotSubject(selectedWeekday, selectedDaySlotIndex) && (
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    className="flex-1"
                  >
                    削除
                  </Button>
                )}
                <Button variant="outline" onClick={handleCancel}>
                  取消
                </Button>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              グリッドのセルをクリックして授業を設定してください。
            </p>
          )}
        </CardContent>
      </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>科目ごとの消化コマ数</CardTitle>
          <CardDescription>
            この時間割プランで、term中に各科目が合計で何コマ消化できるかを表示します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>科目名</TableHead>
                <TableHead className="text-right">消化コマ数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    科目が登録されていません
                  </TableCell>
                </TableRow>
              ) : (
                subjects.map((subject) => {
                  const count = subjectSlotCounts.get(subject.id) ?? 0;
                  return (
                    <TableRow key={subject.id}>
                      <TableCell className="font-medium">{subject.name}</TableCell>
                      <TableCell className="text-right">
                        {count > 0 ? (
                          <span className="font-semibold">{count} コマ</span>
                        ) : (
                          <span className="text-muted-foreground">0 コマ</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

