"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  autoGenerateFixedTimetable,
  type AutoGenerateFixedTimetableState,
  deleteFixedTimetableSlot,
  saveFixedTimetableSlot,
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

type FixedTimetableSlot = {
  weekday: number;
  daySlotIndex: number;
  subjectId: string;
  subject: Subject;
  name: string | null;
  note: string | null;
};

type FixedTimetableClientProps = {
  termId: string;
  subjects: Subject[];
  fixedTimetableSlots: FixedTimetableSlot[];
  weekdaySlotCounts: Record<number, number>;
};

export function FixedTimetableClient({
  termId,
  subjects,
  fixedTimetableSlots,
  weekdaySlotCounts,
}: FixedTimetableClientProps) {
  const [selectedWeekday, setSelectedWeekday] = useState<number | null>(null);
  const [selectedDaySlotIndex, setSelectedDaySlotIndex] = useState<number | null>(
    null
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");

  const initialState: AutoGenerateFixedTimetableState = {
    status: "idle",
  };
  const [autoGenerateState, autoGenerateAction] = useActionState(
    autoGenerateFixedTimetable,
    initialState
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (autoGenerateState.status === "success") {
      toast.success("固定時間割を自動生成しました");
    } else if (autoGenerateState.status === "error" && autoGenerateState.message) {
      toast.error(autoGenerateState.message);
    }
  }, [autoGenerateState]);

  const fixedSlotsMap = useMemo(() => {
    const map = new Map<string, FixedTimetableSlot>();
    for (const slot of fixedTimetableSlots) {
      const key = `${slot.weekday}-${slot.daySlotIndex}`;
      map.set(key, slot);
    }
    return map;
  }, [fixedTimetableSlots]);

  const maxSlotCount = useMemo(() => {
    return Math.max(...Object.values(weekdaySlotCounts), 0);
  }, [weekdaySlotCounts]);

  const slots = useMemo(() => {
    return Array.from({ length: maxSlotCount }, (_, index) => index + 1);
  }, [maxSlotCount]);

  const handleCellClick = (weekday: number, daySlotIndex: number) => {
    const key = `${weekday}-${daySlotIndex}`;
    const existingSlot = fixedSlotsMap.get(key);

    setSelectedWeekday(weekday);
    setSelectedDaySlotIndex(daySlotIndex);
    setSelectedSubjectId(existingSlot?.subjectId ?? "");
    setName(existingSlot?.name ?? "");
    setNote(existingSlot?.note ?? "");
  };

  const handleSave = async () => {
    if (selectedWeekday === null || selectedDaySlotIndex === null) {
      return;
    }

    if (!selectedSubjectId) {
      return;
    }

    const formData = new FormData();
    formData.append("termId", termId);
    formData.append("weekday", String(selectedWeekday));
    formData.append("daySlotIndex", String(selectedDaySlotIndex));
    formData.append("subjectId", selectedSubjectId);
    formData.append("name", name);
    formData.append("note", note);
    await saveFixedTimetableSlot(formData);

    // リセット
    setSelectedWeekday(null);
    setSelectedDaySlotIndex(null);
    setSelectedSubjectId("");
    setName("");
    setNote("");
  };

  const handleDelete = async () => {
    if (selectedWeekday === null || selectedDaySlotIndex === null) {
      return;
    }

    const formData = new FormData();
    formData.append("termId", termId);
    formData.append("weekday", String(selectedWeekday));
    formData.append("daySlotIndex", String(selectedDaySlotIndex));
    await deleteFixedTimetableSlot(formData);

    // リセット
    setSelectedWeekday(null);
    setSelectedDaySlotIndex(null);
    setSelectedSubjectId("");
    setName("");
    setNote("");
  };

  const handleCancel = () => {
    setSelectedWeekday(null);
    setSelectedDaySlotIndex(null);
    setSelectedSubjectId("");
    setName("");
    setNote("");
  };

  const getSlotSubject = (weekday: number, daySlotIndex: number) => {
    const key = `${weekday}-${daySlotIndex}`;
    return fixedSlotsMap.get(key);
  };

  const handleAutoGenerate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (
      !confirm(
        "既存の固定時間割がすべて削除され、自動生成された時間割で置き換えられます。よろしいですか？"
      )
    ) {
      return;
    }

    const formData = new FormData(e.currentTarget);
    startTransition(() => {
      autoGenerateAction(formData);
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>週次グリッド</CardTitle>
              <CardDescription>
                曜日とコマごとの固定枠を設定します。セルをクリックして設定してください。
              </CardDescription>
            </div>
            <form onSubmit={handleAutoGenerate}>
              <input type="hidden" name="termId" value={termId} />
              <Button type="submit" variant="outline" disabled={isPending}>
                {isPending ? "生成中..." : "自動生成"}
              </Button>
            </form>
          </div>
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
                    const isSet = slotSubject !== undefined;

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
                          <div className="flex flex-col items-center justify-center min-h-[32px] gap-1">
                            <span className="font-medium text-sm">
                              {slotSubject.subject.name}
                            </span>
                            {slotSubject.name && (
                              <span className="text-xs text-muted-foreground">
                                {slotSubject.name}
                              </span>
                            )}
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
          <CardTitle>固定枠の詳細</CardTitle>
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
                <Label>科目</Label>
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
              <div className="grid gap-2">
                <Label htmlFor="fixed-name">グループ名（任意）</Label>
                <Input
                  id="fixed-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: 基本固定時間割"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fixed-note">備考</Label>
                <Input
                  id="fixed-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="例: 専科/場所固定"
                />
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
              グリッドのセルをクリックして固定枠を設定してください。
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

