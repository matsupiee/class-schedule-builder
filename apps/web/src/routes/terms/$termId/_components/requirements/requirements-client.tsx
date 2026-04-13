import { useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";

import { Alert, AlertDescription, AlertTitle } from "@/shared/_components/ui-parts/alert";
import { Button } from "@/shared/_components/ui-parts/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/_components/ui-parts/card";
import { DebouncedInput } from "@/shared/_components/ui-parts/debounced-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/_components/ui-parts/table";
import {
  deleteRequiredLessonCount,
  saveRequiredLessonCount,
} from "@packages/api/actions/requirements";
import { SubjectCreateDialog } from "@/shared/_components/subject-create-dialog";

type Subject = { id: string; name: string };

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
  const router = useRouter();
  const [requiredCounts, setRequiredCounts] = useState<
    Map<string, number | "">
  >(() => {
    const map = new Map<string, number | "">();
    for (const rlc of requiredLessonCounts) {
      map.set(rlc.subjectId, rlc.requiredCount);
    }
    for (const subject of subjects) {
      if (!map.has(subject.id)) map.set(subject.id, "");
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
      if (typeof count === "number") total += count;
    }
    return total;
  }, [requiredCounts]);

  const difference = totalAvailableSlots - totalRequiredCount;
  const hasWarning = difference < 0;

  const handleChange = async (subjectId: string, value: string) => {
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
    const countValue = value === "" ? 0 : Number(value);
    if (Number.isInteger(countValue) && countValue >= 0) {
      try {
        await saveRequiredLessonCount({
          data: { termId, subjectId, requiredCount: countValue },
        });
        await router.invalidate();
      } catch {
        // ignore
      }
    }
  };

  const handleDelete = async (subjectId: string) => {
    try {
      await deleteRequiredLessonCount({ data: { termId, subjectId } });
    } catch {
      // ignore
    }
    setRequiredCounts((prev) => {
      const next = new Map(prev);
      next.set(subjectId, "");
      return next;
    });
    await router.invalidate();
  };

  const sortedSubjects = useMemo(() => {
    return [...subjects].sort((a, b) => a.name.localeCompare(b.name, "ja"));
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
                    <TableCell
                      colSpan={3}
                      className="text-muted-foreground text-center"
                    >
                      科目が登録されていません
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedSubjects.map((subject) => {
                    const currentCount =
                      requiredCounts.get(subject.id) ?? "";
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
                              onChange={(v) => handleChange(subject.id, v)}
                              className="w-24"
                              placeholder="0"
                            />
                            <span className="text-muted-foreground text-sm">
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
          <CardDescription>必要授業数と授業可能コマ数の比較</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="text-muted-foreground text-sm">
                必要コマ数 合計
              </div>
              <div className="mt-2 text-2xl font-semibold">
                {totalRequiredCount} コマ
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-muted-foreground text-sm">
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
                必要コマ数が授業可能コマ数を {Math.abs(difference)}{" "}
                コマ超過しています。 設定を見直してください。
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
