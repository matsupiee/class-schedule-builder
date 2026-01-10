"use client";

import { useActionState, useEffect, useRef, useState } from "react";

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

import {
  createSubject,
  type CreateSubjectState,
} from "@/app/subjects/actions";

const initialState: CreateSubjectState = {
  status: "idle",
};

export function SubjectCreateDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createSubject, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      setOpen(false);
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>科目を新規作成</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>科目を新規作成</DialogTitle>
          <DialogDescription>
            科目名を入力してください。
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="subject-name">科目名</Label>
            <Input
              id="subject-name"
              name="name"
              placeholder="例: 国語"
              required
            />
          </div>
          {state.status === "error" && state.message ? (
            <p className="text-destructive text-sm">{state.message}</p>
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
  );
}

