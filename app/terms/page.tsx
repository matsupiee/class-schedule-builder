import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TermCreateDialog } from "@/app/terms/_components/term-create-dialog"
import { prisma } from "@/lib/prisma/prisma"
import Link from "next/link"

function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function calculateWeeks(start: Date, end: Date) {
  const msInDay = 24 * 60 * 60 * 1000
  const days = Math.floor((end.getTime() - start.getTime()) / msInDay) + 1
  return Math.ceil(days / 7)
}

export default async function TermsPage() {
  const terms = await prisma.term.findMany({
    orderBy: { startsAt: "asc" },
  })

  return (
    <main className="min-h-screen bg-muted/30 px-6 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">学期一覧</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              各学期の期間と授業週数を管理します。
            </p>
          </div>
          <TermCreateDialog />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>登録済みの学期</CardTitle>
            <CardDescription>学期の一覧と期間の確認。</CardDescription>
            <CardAction className="text-muted-foreground text-sm">
              {terms.length} 件
            </CardAction>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>学期名</TableHead>
                  <TableHead>開始日</TableHead>
                  <TableHead>終了日</TableHead>
                  <TableHead className="text-right">授業週数</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {terms.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className="text-muted-foreground text-center"
                      colSpan={4}
                    >
                      まだ学期が登録されていません。
                    </TableCell>
                  </TableRow>
                ) : (
                  terms.map((term) => (
                    <TableRow key={term.id} className="cursor-pointer">
                      <TableCell className="font-medium">
                        <Link
                          className="block w-full"
                          href={`/terms/${term.id}`}
                        >
                          {term.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          className="block w-full"
                          href={`/terms/${term.id}`}
                        >
                          {formatDate(term.startsAt)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          className="block w-full"
                          href={`/terms/${term.id}`}
                        >
                          {formatDate(term.endsAt)}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          className="block w-full text-right"
                          href={`/terms/${term.id}`}
                        >
                          {calculateWeeks(term.startsAt, term.endsAt)} 週
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
