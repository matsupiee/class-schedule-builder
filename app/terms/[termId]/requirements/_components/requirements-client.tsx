"use client";

import { useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DebouncedInput } from "@/components/ui/debounced-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  deleteRequiredLessonCount,
  saveRequiredLessonCount,
} from "../actions";
import { SubjectCreateDialog } from "@/app/subjects/_components/subject-create-dialog";

type Subject = {
  id: string;
  name: string;
};

type RequiredLessonCount = {
  subjectId: string;
  requiredCount: number;
};

type RequirementsClientProps = {
  termId: string;
  subjects: Subject[];
  requiredLessonCounts: RequiredLessonCount[];
  totalAvailableSlots: number;
};

export function RequirementsClient({
  termId,
  subjects,
  requiredLessonCounts,
  totalAvailableSlots,
}: RequirementsClientProps) {
  const [requiredCounts, setRequiredCounts] = useState<
    Map<string, number | "">
  >(() => {
    const map = new Map<string, number | "">();
    for (const rlc of requiredLessonCounts) {
      map.set(rlc.subjectId, rlc.requiredCount);
    }
    // 設定されていない科目は空文字列で初期化
    for (const subject of subjects) {
      if (!map.has(subject.id)) {
        map.set(subject.id, "");
      }
    }
    return map;
  });

  const requiredCountsMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const rlc of requiredLessonCounts) {
      map.set(rlc.subjectId, rlc.requiredCount);
    }
    return map;
  }, [requiredLessonCounts]);

  const totalRequiredCount = useMemo(() => {
    let total = 0;
    for (const count of requiredCounts.values()) {
      if (typeof count === "number") {
        total += count;
      }
    }
    return total;
  }, [requiredCounts]);

  const difference = totalAvailableSlots - totalRequiredCount;
  const hasWarning = difference < 0;

  const handleChange = async (subjectId: string, value: string) => {
    // 入力値を状態に反映
    if (value === "") {
      setRequiredCounts((prev) => {
        const next = new Map(prev);
        next.set(subjectId, "");
        return next;
      });
    } else {
      const numValue = Number(value);
      if (Number.isInteger(numValue) && numValue >= 0) {
        setRequiredCounts((prev) => {
          const next = new Map(prev);
          next.set(subjectId, numValue);
          return next;
        });
      }
    }

    // 0.5秒後にDBに保存
    const countValue = value === "" ? 0 : Number(value);
    if (Number.isInteger(countValue) && countValue >= 0) {
      const formData = new FormData();
      formData.append("termId", termId);
      formData.append("subjectId", subjectId);
      formData.append("requiredCount", String(countValue));
      await saveRequiredLessonCount(formData);
    }
  };

  const handleDelete = async (subjectId: string) => {
    const formData = new FormData();
    formData.append("termId", termId);
    formData.append("subjectId", subjectId);
    await deleteRequiredLessonCount(formData);
    setRequiredCounts((prev) => {
      const next = new Map(prev);
      next.set(subjectId, "");
      return next;
    });
  };

  const sortedSubjects = useMemo(() => {
    return [...subjects].sort((a, b) => {
      return a.name.localeCompare(b.name, "ja");
    });
  }, [subjects]);

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>科目ごとの必要授業数</CardTitle>
              <CardDescription>
                各科目に必要な授業数を設定します。
              </CardDescription>
            </div>
            <SubjectCreateDialog />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>科目名</TableHead>
                  <TableHead className="text-right">必要授業数</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSubjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      科目が登録されていません
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedSubjects.map((subject) => {
                    const currentCount = requiredCounts.get(subject.id) ?? "";
                    const hasCount = requiredCountsMap.has(subject.id);

                    return (
                      <TableRow key={subject.id}>
                        <TableCell className="font-medium">
                          {subject.name}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <DebouncedInput
                              type="number"
                              min="0"
                              value={currentCount}
                              onChange={(value) => handleChange(subject.id, value)}
                              className="w-24"
                              placeholder="0"
                            />
                            <span className="text-sm text-muted-foreground">
                              コマ
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {hasCount && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(subject.id)}
                            >
                              削除
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>集計</CardTitle>
          <CardDescription>
            必要授業数と授業可能コマ数の比較
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">
                必要コマ数 合計
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {totalRequiredCount} コマ
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">
                授業可能コマ数 合計
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {totalAvailableSlots} コマ
              </div>
            </div>
          </div>

          {hasWarning && (
            <Alert variant="destructive">
              <AlertTitle>警告</AlertTitle>
              <AlertDescription>
                必要コマ数が授業可能コマ数を
                {Math.abs(difference)} コマ超過しています。
                設定を見直してください。
              </AlertDescription>
            </Alert>
          )}

          {!hasWarning && difference > 0 && (
            <Alert>
              <AlertTitle>余裕あり</AlertTitle>
              <AlertDescription>
                授業可能コマ数が必要コマ数を {difference} コマ上回っています。
              </AlertDescription>
            </Alert>
          )}

          {!hasWarning && difference === 0 && (
            <Alert>
              <AlertTitle>ちょうど一致</AlertTitle>
              <AlertDescription>
                必要コマ数と授業可能コマ数が一致しています。
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

