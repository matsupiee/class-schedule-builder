import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";

import { Button } from "@/shared/_components/ui-parts/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/_components/ui-parts/card";
import { Input } from "@/shared/_components/ui-parts/input";
import { Label } from "@/shared/_components/ui-parts/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/_components/ui-parts/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/_components/ui-parts/table";
import {
  autoGenerateFixedTimetable,
  deleteFixedTimetableSlot,
  saveFixedTimetableSlot,
} from "@packages/api/actions/fixed-timetable";

const weekdays = [
  { value: 1, label: "月" },
  { value: 2, label: "火" },
  { value: 3, label: "水" },
  { value: 4, label: "木" },
  { value: 5, label: "金" },
] as const;

type Subject = { id: string; name: string };

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
  const router = useRouter();
  const [selectedWeekday, setSelectedWeekday] = useState<number | null>(null);
  const [selectedDaySlotIndex, setSelectedDaySlotIndex] = useState<
    number | null
  >(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const fixedSlotsMap = useMemo(() => {
    const map = new Map<string, FixedTimetableSlot>();
    for (const slot of fixedTimetableSlots) {
      map.set(`${slot.weekday}-${slot.daySlotIndex}`, slot);
    }
    return map;
  }, [fixedTimetableSlots]);

  const maxSlotCount = useMemo(
    () => Math.max(...Object.values(weekdaySlotCounts), 0),
    [weekdaySlotCounts],
  );

  const slots = useMemo(
    () => Array.from({ length: maxSlotCount }, (_, i) => i + 1),
    [maxSlotCount],
  );

  const handleCellClick = (weekday: number, daySlotIndex: number) => {
    const existing = fixedSlotsMap.get(`${weekday}-${daySlotIndex}`);
    setSelectedWeekday(weekday);
    setSelectedDaySlotIndex(daySlotIndex);
    setSelectedSubjectId(existing?.subjectId ?? "");
    setName(existing?.name ?? "");
    setNote(existing?.note ?? "");
  };

  const reset = () => {
    setSelectedWeekday(null);
    setSelectedDaySlotIndex(null);
    setSelectedSubjectId("");
    setName("");
    setNote("");
  };

  const handleSave = async () => {
    if (selectedWeekday === null || selectedDaySlotIndex === null) return;
    if (!selectedSubjectId) return;
    await saveFixedTimetableSlot({
      data: {
        termId,
        weekday: selectedWeekday,
        daySlotIndex: selectedDaySlotIndex,
        subjectId: selectedSubjectId,
        name,
        note,
      },
    });
    reset();
    await router.invalidate();
  };

  const handleDelete = async () => {
    if (selectedWeekday === null || selectedDaySlotIndex === null) return;
    await deleteFixedTimetableSlot({
      data: {
        termId,
        weekday: selectedWeekday,
        daySlotIndex: selectedDaySlotIndex,
      },
    });
    reset();
    await router.invalidate();
  };

  const getSlotSubject = (weekday: number, daySlotIndex: number) =>
    fixedSlotsMap.get(`${weekday}-${daySlotIndex}`);

  const handleAutoGenerate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !confirm(
        "既存の固定時間割がすべて削除され、自動生成された時間割で置き換えられます。よろしいですか？",
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        await autoGenerateFixedTimetable({ data: { termId } });
        toast.success("固定時間割を自動生成しました");
        await router.invalidate();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "自動生成に失敗しました");
      }
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
                {weekdays.map((w) => (
                  <TableHead key={w.value}>{w.label}</TableHead>
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
                        onClick={() =>
                          !isDisabled && handleCellClick(weekday.value, slot)
                        }
                      >
                        {isDisabled ? (
                          <span className="text-muted-foreground text-xs">
                            -
                          </span>
                        ) : isSet ? (
                          <div className="flex min-h-[32px] flex-col items-center justify-center gap-1">
                            <span className="text-sm font-medium">
                              {slotSubject.subject.name}
                            </span>
                            {slotSubject.name && (
                              <span className="text-muted-foreground text-xs">
                                {slotSubject.name}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex min-h-[32px] items-center justify-center">
                            <span className="text-muted-foreground border-muted-foreground/30 rounded border border-dashed px-2 py-1 text-xs">
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
                <Button variant="outline" onClick={reset}>
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
