import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SettingsClient } from "@/src/components/terms/settings-client";
import { getTermSettings } from "@packages/api/actions/terms";

type SearchParams = { section?: string };

export const Route = createFileRoute("/terms/$termId/settings")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    section: typeof search.section === "string" ? search.section : undefined,
  }),
  loader: async ({ params }) => {
    const data = await getTermSettings({ data: { termId: params.termId } });
    if (!data) throw notFound();
    return data;
  },
  component: TermSettingsPage,
});

function TermSettingsPage() {
  const data = Route.useLoaderData();
  const { section } = Route.useSearch();

  return (
    <main className="bg-muted/30 min-h-screen px-6 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/terms/$termId" params={{ termId: data.term.id }}>
              <ChevronLeftIcon className="h-5 w-5" />
              <span className="sr-only">学期ダッシュボードへ戻る</span>
            </Link>
          </Button>
          <div className="flex-1">
            <p className="text-muted-foreground text-sm">設定</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {data.term.name}
            </h1>
          </div>
        </div>

        <SettingsClient
          termId={data.term.id}
          termStartsAtIso={data.term.startsAtIso}
          termEndsAtIso={data.term.endsAtIso}
          calendarDays={data.calendarDays}
          subjects={data.subjects}
          requiredLessonCounts={data.requiredLessonCounts}
          totalAvailableSlots={data.totalAvailableSlots}
          fixedTimetableSlots={data.fixedTimetableSlots}
          weekdaySlotCounts={data.weekdaySlotCounts}
          subjectCounts={data.subjectCounts}
          defaultOpenSection={
            section === "fixedTimetable" ? "fixedTimetable" : "calendar"
          }
        />
      </div>
    </main>
  );
}
