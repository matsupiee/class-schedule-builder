import { useRef, useState, useTransition } from "react";
import { useRouter } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
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
import { createTerm } from "@/lib/server/actions/terms";

export function TermCreateDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const fd = new FormData(event.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      startsAt: String(fd.get("startsAt") ?? ""),
      endsAt: String(fd.get("endsAt") ?? ""),
      defaultSlotCounts: {
        "1": Number(fd.get("defaultSlotCountMon") ?? 0),
        "2": Number(fd.get("defaultSlotCountTue") ?? 0),
        "3": Number(fd.get("defaultSlotCountWed") ?? 0),
        "4": Number(fd.get("defaultSlotCountThu") ?? 0),
        "5": Number(fd.get("defaultSlotCountFri") ?? 0),
      },
    };
    startTransition(async () => {
      try {
        await createTerm({ data: payload });
        setOpen(false);
        formRef.current?.reset();
        await router.invalidate();
      } catch (e) {
        setError(e instanceof Error ? e.message : "作成に失敗しました。");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>学期を新規作成</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>学期を新規作成</DialogTitle>
          <DialogDescription>
            学期名と期間を入力してください。
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="term-name">学期名</Label>
            <Input
              id="term-name"
              name="name"
              placeholder="例: 1学期"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="term-start">開始日</Label>
            <Input id="term-start" name="startsAt" type="date" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="term-end">終了日</Label>
            <Input id="term-end" name="endsAt" type="date" required />
          </div>
          <div className="grid gap-2">
            <Label>平日のデフォルトコマ数</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { id: "term-slot-mon", name: "defaultSlotCountMon", label: "月曜" },
                { id: "term-slot-tue", name: "defaultSlotCountTue", label: "火曜" },
                { id: "term-slot-wed", name: "defaultSlotCountWed", label: "水曜" },
                { id: "term-slot-thu", name: "defaultSlotCountThu", label: "木曜" },
                { id: "term-slot-fri", name: "defaultSlotCountFri", label: "金曜" },
              ].map((field) => (
                <div key={field.id} className="grid gap-2">
                  <Label htmlFor={field.id}>{field.label}</Label>
                  <Input
                    id={field.id}
                    name={field.name}
                    type="number"
                    min={1}
                    defaultValue={6}
                    required
                  />
                </div>
              ))}
            </div>
          </div>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                キャンセル
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              作成
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
