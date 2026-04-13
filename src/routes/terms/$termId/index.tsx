import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FixedTimetableComparison } from "@/src/components/terms/fixed-timetable/fixed-timetable-comparison";
import { getTermDashboard } from "@/lib/server/actions/terms";

export const Route = createFileRoute("/terms/$termId/")({
  loader: async ({ params }) => {
    const data = await getTermDashboard({ data: { termId: params.termId } });
    if (!data) throw notFound();
    return data;
  },
  component: TermDashboardPage,
});

function formatDate(iso: string) {
  const date = new Date(iso);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function calculateWeeks(startIso: string, endIso: string) {
  const msInDay = 24 * 60 * 60 * 1000;
  const days =
    Math.floor(
      (new Date(endIso).getTime() - new Date(startIso).getTime()) / msInDay,
    ) + 1;
  return Math.ceil(days / 7);
}

function TermDashboardPage() {
  const data = Route.useLoaderData();
  const {
    term,
    calendarDaysCount,
    requiredLessonCountsCount,
    fixedTimetableSlotsCount,
    fixedTimetableSlots,
    weekdaySlotCounts,
    requiredLessonCounts,
    subjectCounts,
  } = data;

  const weekdays = [
    { value: 1, label: "月" },
    { value: 2, label: "火" },
    { value: 3, label: "水" },
    { value: 4, label: "木" },
    { value: 5, label: "金" },
  ] as const;

  const slotsMap = new Map<
    string,
    { subjectId: string; subject: { id: string; name: string } }
  >();
  for (const slot of fixedTimetableSlots) {
    slotsMap.set(`${slot.weekday}-${slot.daySlotIndex}`, {
      subjectId: slot.subjectId,
      subject: slot.subject,
    });
  }
  const maxSlotCount = Math.max(...Object.values(weekdaySlotCounts), 0);

  return (
    <main className="bg-muted/30 min-h-screen px-6 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/terms">
              <ChevronLeftIcon className="h-5 w-5" />
              <span className="sr-only">学期一覧へ戻る</span>
            </Link>
          </Button>
          <div className="flex-1">
            <p className="text-muted-foreground text-sm">学期ダッシュボード</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {term.name}
            </h1>
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
                  {formatDate(term.startsAtIso)} 〜 {formatDate(term.endsAtIso)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">授業週数</span>
                <span>
                  {calculateWeeks(term.startsAtIso, term.endsAtIso)} 週
                </span>
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
                  <span className="font-medium text-green-600">設定済み</span>
                ) : (
                  <span className="text-muted-foreground">未設定</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span>法定授業数</span>
                {requiredLessonCountsCount > 0 ? (
                  <span className="font-medium text-green-600">
                    設定済み ({requiredLessonCountsCount}科目)
                  </span>
                ) : (
                  <span className="text-muted-foreground">未設定</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span>固定時間割</span>
                {fixedTimetableSlotsCount > 0 ? (
                  <span className="font-medium text-green-600">
                    設定済み ({fixedTimetableSlotsCount}コマ)
                  </span>
                ) : (
                  <span className="text-muted-foreground">未設定</span>
                )}
              </div>

              <div className="mt-6 border-t pt-6">
                <Button asChild className="w-full">
                  <Link
                    to="/terms/$termId/settings"
                    params={{ termId: term.id }}
                  >
                    設定を開く
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {fixedTimetableSlotsCount > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>固定時間割</CardTitle>
                  <CardDescription>
                    週次グリッドに設定された固定時間割を表示します。
                  </CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link
                    to="/terms/$termId/settings"
                    params={{ termId: term.id }}
                    search={{ section: "fixedTimetable" }}
                  >
                    設定
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
                        {weekdays.map((w) => (
                          <TableHead key={w.value}>{w.label}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: maxSlotCount }, (_, i) => {
                        const slot = i + 1;
                        return (
                          <TableRow key={slot}>
                            <TableCell className="font-medium">
                              {slot} 限
                            </TableCell>
                            {weekdays.map((weekday) => {
                              const key = `${weekday.value}-${slot}`;
                              const slotData = slotsMap.get(key);
                              const isDisabled =
                                weekdaySlotCounts[weekday.value] ===
                                  undefined ||
                                slot > weekdaySlotCounts[weekday.value];
                              const isSet = slotData !== undefined;
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
                                    <span className="text-muted-foreground text-xs">
                                      -
                                    </span>
                                  ) : isSet ? (
                                    <span className="text-sm font-medium">
                                      {slotData?.subject?.name}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground text-xs">
                                      未設定
                                    </span>
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">
                  まだスロットが設定されていません
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <FixedTimetableComparison
          termId={term.id}
          requiredLessonCounts={requiredLessonCounts}
          subjectCounts={subjectCounts}
        />
      </div>
    </main>
  );
}
