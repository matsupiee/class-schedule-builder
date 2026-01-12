"use client";

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

type RequiredLessonCount = {
  subjectId: string;
  subjectName: string;
  requiredCount: number;
};

type SubjectCount = {
  subjectId: string;
  count: number;
};

type FixedTimetableComparisonProps = {
  termId: string;
  requiredLessonCounts: RequiredLessonCount[];
  subjectCounts: SubjectCount[];
};

export function FixedTimetableComparison({
  termId,
  requiredLessonCounts,
  subjectCounts,
}: FixedTimetableComparisonProps) {
  // subjectCountsをMapに変換して検索を高速化
  const subjectCountsMap = new Map<string, number>();
  for (const sc of subjectCounts) {
    subjectCountsMap.set(sc.subjectId, sc.count);
  }

  // FixedTimetableSlotに設定されている科目のみを表示
  const subjectsWithFixedSlots = requiredLessonCounts.filter((rlc) =>
    subjectCountsMap.has(rlc.subjectId)
  );

  if (subjectsWithFixedSlots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>授業消化数と法定必要数の比較</CardTitle>
          <CardDescription>
            固定時間割が設定されていません。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            固定時間割を設定すると、ここに比較結果が表示されます。
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>授業消化数と法定必要数の比較</CardTitle>
        <CardDescription>
          固定時間割に基づいて、科目ごとの授業消化数と法定必要数を比較します。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>科目</TableHead>
                <TableHead className="text-right">法定必要数</TableHead>
                <TableHead className="text-right">授業消化数</TableHead>
                <TableHead className="text-right">差</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjectsWithFixedSlots.map((rlc) => {
                const actualCount = subjectCountsMap.get(rlc.subjectId) ?? 0;
                const difference = actualCount - rlc.requiredCount;
                const isOver = difference > 0;
                const isUnder = difference < 0;

                return (
                  <TableRow key={rlc.subjectId}>
                    <TableCell className="font-medium">
                      {rlc.subjectName}
                    </TableCell>
                    <TableCell className="text-right">
                      {rlc.requiredCount} コマ
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          isOver
                            ? "text-green-600 font-medium"
                            : isUnder
                            ? "text-red-600 font-medium"
                            : "font-medium"
                        }
                      >
                        {actualCount} コマ
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {difference !== 0 ? (
                        <span
                          className={`text-sm font-medium ${
                            isOver ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {isOver ? "+" : ""}
                          {difference} コマ
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          ±0 コマ
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
