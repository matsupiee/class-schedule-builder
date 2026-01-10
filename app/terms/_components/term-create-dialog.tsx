"use client"

import { useEffect, useRef, useState } from "react"
import { useFormState } from "react-dom"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { createTerm, type CreateTermState } from "@/app/terms/actions"

const initialState: CreateTermState = {
  status: "idle",
}

export function TermCreateDialog() {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useFormState(createTerm, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.status === "success") {
      setOpen(false)
      formRef.current?.reset()
    }
  }, [state.status])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>学期を新規作成</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>学期を新規作成</DialogTitle>
          <DialogDescription>学期名と期間を入力してください。</DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="grid gap-4">
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
  )
}
