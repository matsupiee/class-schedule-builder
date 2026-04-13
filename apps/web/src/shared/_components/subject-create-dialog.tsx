import { useRef, useState, useTransition } from "react";
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
import { createSubject } from "@packages/api/actions/subjects";

export function SubjectCreateDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      setError("科目名を入力してください。");
      return;
    }
    startTransition(async () => {
      try {
        await createSubject({ data: { name } });
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
        <Button>科目を新規作成</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>科目を新規作成</DialogTitle>
          <DialogDescription>科目名を入力してください。</DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="subject-name">科目名</Label>
            <Input
              id="subject-name"
              name="name"
              placeholder="例: 国語"
              required
            />
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
