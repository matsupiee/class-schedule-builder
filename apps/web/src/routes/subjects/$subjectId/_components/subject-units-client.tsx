import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "@tanstack/react-router";

import { Button } from "@/shared/_components/ui-parts/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/_components/ui-parts/dialog";
import { Input } from "@/shared/_components/ui-parts/input";
import { Label } from "@/shared/_components/ui-parts/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/_components/ui-parts/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/_components/ui-parts/alert-dialog";
import {
  createSubjectUnit,
  deleteSubjectUnit,
  reorderSubjectUnits,
  updateSubjectUnit,
} from "@packages/api/actions/subject-units";

type SubjectUnit = {
  id: string;
  unitName: string;
  slotCount: number;
  order: number;
};

type SubjectUnitsClientProps = {
  subjectId: string;
  subjectName: string;
  initialUnits: SubjectUnit[];
};

function normalizeUnits(units: SubjectUnit[]): SubjectUnit[] {
  return [...units].sort((a, b) => a.order - b.order);
}

export function SubjectUnitsClient({
  subjectId,
  subjectName,
  initialUnits,
}: SubjectUnitsClientProps) {
  const router = useRouter();
  const [units, setUnits] = useState<SubjectUnit[]>(() =>
    normalizeUnits(initialUnits),
  );
  const [isPending, startTransition] = useTransition();

  // initialUnits が更新されたら同期
  useEffect(() => {
    setUnits(normalizeUnits(initialUnits));
  }, [initialUnits]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const createFormRef = useRef<HTMLFormElement>(null);

  const totalSlotCount = useMemo(
    () => units.reduce((sum, u) => sum + u.slotCount, 0),
    [units],
  );

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    const fd = new FormData(event.currentTarget);
    const unitName = String(fd.get("unitName") ?? "").trim();
    const slotCount = Number(fd.get("slotCount") ?? 0);
    startTransition(async () => {
      try {
        await createSubjectUnit({
          data: { subjectId, unitName, slotCount },
        });
        setCreateOpen(false);
        createFormRef.current?.reset();
        await router.invalidate();
      } catch (e) {
        setCreateError(
          e instanceof Error ? e.message : "作成に失敗しました。",
        );
      }
    });
  }

  const moveUnit = (unitId: string, direction: "up" | "down") => {
    const currentIndex = units.findIndex((u) => u.id === unitId);
    if (currentIndex === -1) return;
    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= units.length) return;
    const next = [...units];
    const [moved] = next.splice(currentIndex, 1);
    next.splice(targetIndex, 0, moved);
    const normalized = next.map((u, idx) => ({ ...u, order: idx + 1 }));
    setUnits(normalized);
    startTransition(async () => {
      await reorderSubjectUnits({
        data: {
          subjectId,
          orderedUnitIds: normalized.map((u) => u.id),
        },
      });
      await router.invalidate();
    });
  };

  const handleUpdate = async (
    unit: SubjectUnit,
    unitName: string,
    slotCount: number,
  ) => {
    await updateSubjectUnit({
      data: { id: unit.id, subjectId, unitName, slotCount },
    });
    await router.invalidate();
  };

  const handleDelete = async (unit: SubjectUnit) => {
    await deleteSubjectUnit({ data: { id: unit.id, subjectId } });
    setUnits((prev) => prev.filter((u) => u.id !== unit.id));
    await router.invalidate();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-muted-foreground text-sm">
          {units.length} 件 / 合計 {totalSlotCount} コマ
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>単元を追加</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>単元を追加</DialogTitle>
              <DialogDescription>
                {subjectName} の単元を追加します。
              </DialogDescription>
            </DialogHeader>
            <form
              ref={createFormRef}
              onSubmit={handleCreate}
              className="grid gap-4"
            >
              <div className="grid gap-2">
                <Label htmlFor="unitName">単元名</Label>
                <Input
                  id="unitName"
                  name="unitName"
                  placeholder="例: ごんぎつね"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="slotCount">コマ数</Label>
                <Input
                  id="slotCount"
                  name="slotCount"
                  type="number"
                  min={1}
                  step={1}
                  placeholder="例: 8"
                  required
                />
              </div>
              {createError ? (
                <p className="text-destructive text-sm">{createError}</p>
              ) : null}
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    キャンセル
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isPending}>
                  追加
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">順番</TableHead>
            <TableHead>単元名</TableHead>
            <TableHead className="w-[120px] text-right">コマ数</TableHead>
            <TableHead className="w-[260px] text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {units.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-muted-foreground text-center"
              >
                まだ単元が登録されていません。右上の「単元を追加」から作成してください。
              </TableCell>
            </TableRow>
          ) : (
            units.map((unit, index) => (
              <TableRow key={unit.id}>
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell className="font-medium">{unit.unitName}</TableCell>
                <TableCell className="text-right">
                  {unit.slotCount}{" "}
                  <span className="text-muted-foreground text-xs">コマ</span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isPending || index === 0}
                      onClick={() => moveUnit(unit.id, "up")}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isPending || index === units.length - 1}
                      onClick={() => moveUnit(unit.id, "down")}
                    >
                      ↓
                    </Button>
                    <EditUnitDialog
                      subjectName={subjectName}
                      unit={unit}
                      disabled={isPending}
                      onSave={(unitName, slotCount) =>
                        startTransition(async () => {
                          await handleUpdate(unit, unitName, slotCount);
                        })
                      }
                    />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={isPending}
                        >
                          削除
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            単元を削除しますか？
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            「{unit.unitName}
                            」を削除します。この操作は取り消せません。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>キャンセル</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              startTransition(async () => {
                                await handleDelete(unit);
                              })
                            }
                          >
                            削除する
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function EditUnitDialog({
  subjectName,
  unit,
  disabled,
  onSave,
}: {
  subjectName: string;
  unit: SubjectUnit;
  disabled?: boolean;
  onSave: (unitName: string, slotCount: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [unitName, setUnitName] = useState(unit.unitName);
  const [slotCount, setSlotCount] = useState(String(unit.slotCount));

  useEffect(() => {
    if (!open) {
      setUnitName(unit.unitName);
      setSlotCount(String(unit.slotCount));
    }
  }, [open, unit.unitName, unit.slotCount]);

  const slotCountNumber = Number(slotCount);
  const canSubmit =
    unitName.trim().length > 0 &&
    Number.isInteger(slotCountNumber) &&
    slotCountNumber >= 1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="ghost" disabled={disabled}>
          編集
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>単元を編集</DialogTitle>
          <DialogDescription>
            {subjectName} の「{unit.unitName}」を編集します。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`edit-unitName-${unit.id}`}>単元名</Label>
            <Input
              id={`edit-unitName-${unit.id}`}
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              placeholder="例: ごんぎつね"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`edit-slotCount-${unit.id}`}>コマ数</Label>
            <Input
              id={`edit-slotCount-${unit.id}`}
              type="number"
              min={1}
              step={1}
              value={slotCount}
              onChange={(e) => setSlotCount(e.target.value)}
              placeholder="例: 8"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                キャンセル
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={!canSubmit || disabled}
              onClick={() => {
                onSave(unitName.trim(), slotCountNumber);
                setOpen(false);
              }}
            >
              保存
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
