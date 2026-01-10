"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { TermCalendarClient } from "@/app/terms/[termId]/calendar/_components/term-calendar-client";
import { RequirementsClient } from "@/app/terms/[termId]/requirements/_components/requirements-client";
import { FixedTimetableClient } from "@/app/terms/[termId]/fixed-timetable/_components/fixed-timetable-client";
import { TimetablesClient } from "@/app/terms/[termId]/timetables/_components/timetables-client";

type Subject = {
  id: string;
  name: string;
};

type FixedTimetableSlot = {
  weekday: number;
  daySlotIndex: number;
  subjectId: string;
  subject: Subject;
  name: string | null;
  note: string | null;
};

type TimetablePlan = {
  id: string;
  name: string;
  createdAt: Date;
  timetablePlanSlots: Array<{
    subjectId: string;
    subject: {
      id: string;
      name: string;
    };
  }>;
};

type PlanStat = {
  planId: string;
  subjectCounts: Array<{
    subjectId: string;
    count: number;
  }>;
};

type RequiredLessonCount = {
  subjectId: string;
  subjectName: string;
  requiredCount: number;
};

type SettingsClientProps = {
  termId: string;
  termStartsAtIso: string;
  termEndsAtIso: string;
  holidays: Array<{ date: string; title: string }>;

  subjects: Subject[];
  requiredLessonCounts: RequiredLessonCount[];
  totalAvailableSlots: number;

  fixedTimetableSlots: FixedTimetableSlot[];
  weekdaySlotCounts: Record<number, number>;

  timetablePlans: TimetablePlan[];
  planStats: PlanStat[];
};

export function SettingsClient({
  termId,
  termStartsAtIso,
  termEndsAtIso,
  holidays,
  subjects,
  requiredLessonCounts,
  totalAvailableSlots,
  fixedTimetableSlots,
  weekdaySlotCounts,
  timetablePlans,
  planStats,
}: SettingsClientProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>設定</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={["calendar"]}>
          <AccordionItem value="calendar">
            <AccordionTrigger>1. 授業日カレンダー</AccordionTrigger>
            <AccordionContent>
              <TermCalendarClient
                startDate={termStartsAtIso}
                endDate={termEndsAtIso}
                termId={termId}
                holidays={holidays}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="requirements">
            <AccordionTrigger>2. 法定の必要授業数</AccordionTrigger>
            <AccordionContent>
              <RequirementsClient
                termId={termId}
                subjects={subjects}
                requiredLessonCounts={requiredLessonCounts.map((rlc) => ({
                  subjectId: rlc.subjectId,
                  requiredCount: rlc.requiredCount,
                }))}
                totalAvailableSlots={totalAvailableSlots}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="fixedTimetable">
            <AccordionTrigger>3. 固定時間割</AccordionTrigger>
            <AccordionContent>
              <FixedTimetableClient
                termId={termId}
                subjects={subjects}
                fixedTimetableSlots={fixedTimetableSlots}
                weekdaySlotCounts={weekdaySlotCounts}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="timetables">
            <AccordionTrigger>4. 時間割作成・管理</AccordionTrigger>
            <AccordionContent>
              <TimetablesClient
                termId={termId}
                timetablePlans={timetablePlans}
                requiredLessonCounts={requiredLessonCounts}
                planStats={planStats}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}


