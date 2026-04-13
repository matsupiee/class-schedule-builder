import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/_components/ui-parts/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/_components/ui-parts/table";

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
  requiredLessonCounts,
  subjectCounts,
}: FixedTimetableComparisonProps) {
  const subjectCountsMap = new Map<string, number>();
  for (const sc of subjectCounts) subjectCountsMap.set(sc.subjectId, sc.count);
  const subjectsWithFixedSlots = requiredLessonCounts.filter((rlc) =>
    subjectCountsMap.has(rlc.subjectId),
  );

  if (subjectsWithFixedSlots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>授業消化数と法定必要数の比較</CardTitle>
          <CardDescription>固定時間割が設定されていません。</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground py-8 text-center">
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
                            ? "font-medium text-green-600"
                            : isUnder
                              ? "font-medium text-red-600"
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
