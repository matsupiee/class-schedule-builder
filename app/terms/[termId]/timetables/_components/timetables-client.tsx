"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  createTimetablePlan,
  deleteTimetablePlan,
  type CreateTimetablePlanState,
} from "../actions";

type TimetablePlan = {
  id: string;
  name: string;
  createdAt: Date;
  timetablePlanSlots: Array<{
    subjectId: string;
    subject: {
      id: string;
      name: string;
    };
  }>;
};

type RequiredLessonCount = {
  subjectId: string;
  subjectName: string;
  requiredCount: number;
};

type PlanStat = {
  planId: string;
  subjectCounts: Array<{
    subjectId: string;
    count: number;
  }>;
};

type TimetablesClientProps = {
  termId: string;
  timetablePlans: TimetablePlan[];
  requiredLessonCounts: RequiredLessonCount[];
  planStats: PlanStat[];
};

export function TimetablesClient({
  termId,
  timetablePlans,
  requiredLessonCounts,
  planStats,
}: TimetablesClientProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const initialState: CreateTimetablePlanState = {
    status: "idle",
  };
  const [state, formAction] = useActionState(createTimetablePlan, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // state.statusがsuccessになったときにダイアログを閉じる
  const isOpen = open && state.status !== "success";

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  const handleDelete = async (planId: string) => {
    if (!confirm("この時間割を削除しますか？")) {
      return;
    }

    const formData = new FormData();
    formData.append("termId", termId);
    formData.append("timetablePlanId", planId);
    await deleteTimetablePlan(formData);
  };

  const getSubjectCount = (planId: string, subjectId: string) => {
    const stat = planStats.find((s) => s.planId === planId);
    if (!stat) return 0;
    const subjectStat = stat.subjectCounts.find(
      (s) => s.subjectId === subjectId
    );
    return subjectStat?.count ?? 0;
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>時間割一覧</CardTitle>
              <CardDescription>
                時間割プランの作成と管理を行います。
              </CardDescription>
            </div>
            <Dialog
              open={isOpen}
              onOpenChange={(newOpen) => {
                setOpen(newOpen);
                if (!newOpen && state.status === "success") {
                  // ダイアログが閉じられたときにstateをリセット
                  formRef.current?.reset();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button>時間割を自動作成</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>時間割を自動作成</DialogTitle>
                  <DialogDescription>
                    新しい時間割プランを作成します。固定時間割が自動的に反映されます。
                  </DialogDescription>
                </DialogHeader>
                <form ref={formRef} action={formAction} className="grid gap-4">
                  <input type="hidden" name="termId" value={termId} />
                  <div className="grid gap-2">
                    <Label htmlFor="plan-name">時間割名</Label>
                    <Input
                      id="plan-name"
                      name="name"
                      placeholder="例: 案A"
                      required
                    />
                  </div>
                  {state.status === "error" && state.message ? (
                    <p className="text-destructive text-sm">
                      {state.message}
                    </p>
                  ) : null}
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">
                        キャンセル
                      </Button>
                    </DialogClose>
                    <Button type="submit">作成</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {timetablePlans.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              まだ時間割が作成されていません。
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>時間割名</TableHead>
                  <TableHead>作成日</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timetablePlans.map((plan) => (
                  <TableRow
                    key={plan.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={(e) => {
                      // ボタンがクリックされた場合は行のクリックを無視
                      if (
                        (e.target as HTMLElement).closest("button") ||
                        (e.target as HTMLElement).closest("a")
                      ) {
                        return;
                      }
                      router.push(`/terms/${termId}/timetables/${plan.id}`);
                    }}
                  >
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>
                      {plan.createdAt.toLocaleDateString("ja-JP")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild size="sm" variant="outline">
                          <a href={`/terms/${termId}/timetables/${plan.id}`}>
                            編集
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(plan.id);
                          }}
                        >
                          削除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {timetablePlans.length > 0 && requiredLessonCounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>授業消化数と法定必要数の比較</CardTitle>
            <CardDescription>
              各時間割プランについて、科目ごとの授業消化数と法定必要数を比較します。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>科目</TableHead>
                    <TableHead className="text-right">法定必要数</TableHead>
                    {timetablePlans.map((plan) => (
                      <TableHead key={plan.id} className="text-right">
                        {plan.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requiredLessonCounts.map((rlc) => (
                    <TableRow key={rlc.subjectId}>
                      <TableCell className="font-medium">
                        {rlc.subjectName}
                      </TableCell>
                      <TableCell className="text-right">
                        {rlc.requiredCount} コマ
                      </TableCell>
                      {timetablePlans.map((plan) => {
                        const actualCount = getSubjectCount(
                          plan.id,
                          rlc.subjectId
                        );
                        const difference = actualCount - rlc.requiredCount;
                        const isOver = difference > 0;
                        const isUnder = difference < 0;

                        return (
                          <TableCell key={plan.id} className="text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span
                                className={
                                  isOver
                                    ? "text-green-600 font-medium"
                                    : isUnder
                                    ? "text-red-600 font-medium"
                                    : ""
                                }
                              >
                                {actualCount} コマ
                              </span>
                              {difference !== 0 && (
                                <span
                                  className={`text-xs ${
                                    isOver
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {isOver ? "+" : ""}
                                  {difference} コマ
                                </span>
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

