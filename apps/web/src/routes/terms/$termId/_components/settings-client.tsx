import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/shared/_components/ui-parts/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/_components/ui-parts/card";

import { TermCalendarClient } from "@/routes/terms/$termId/_components/calendar/term-calendar-client";
import { RequirementsClient } from "@/routes/terms/$termId/_components/requirements/requirements-client";
import { FixedTimetableClient } from "@/routes/terms/$termId/_components/fixed-timetable/fixed-timetable-client";
import { FixedTimetableComparison } from "@/routes/terms/$termId/_components/fixed-timetable/fixed-timetable-comparison";

type Subject = { id: string; name: string };

type FixedTimetableSlot = {
  weekday: number;
  daySlotIndex: number;
  subjectId: string;
  subject: Subject;
  name: string | null;
  note: string | null;
};

type RequiredLessonCount = {
  subjectId: string;
  subjectName: string;
  requiredCount: number;
};

type SubjectCount = { subjectId: string; count: number };

type SettingsClientProps = {
  termId: string;
  termStartsAtIso: string;
  termEndsAtIso: string;
  calendarDays?: Array<{ date: string; title: string | null; dayType: string }>;
  subjects: Subject[];
  requiredLessonCounts: RequiredLessonCount[];
  totalAvailableSlots: number;
  fixedTimetableSlots: FixedTimetableSlot[];
  weekdaySlotCounts: Record<number, number>;
  subjectCounts: SubjectCount[];
  defaultOpenSection?: string;
};

export function SettingsClient({
  termId,
  termStartsAtIso,
  termEndsAtIso,
  calendarDays = [],
  subjects,
  requiredLessonCounts,
  totalAvailableSlots,
  fixedTimetableSlots,
  weekdaySlotCounts,
  subjectCounts,
  defaultOpenSection = "calendar",
}: SettingsClientProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>設定</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={[defaultOpenSection]}>
          <AccordionItem value="calendar">
            <AccordionTrigger>1. 授業日カレンダー</AccordionTrigger>
            <AccordionContent>
              <TermCalendarClient
                startDate={termStartsAtIso}
                endDate={termEndsAtIso}
                termId={termId}
                calendarDays={calendarDays}
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
              <div className="space-y-6">
                <FixedTimetableClient
                  termId={termId}
                  subjects={subjects}
                  fixedTimetableSlots={fixedTimetableSlots}
                  weekdaySlotCounts={weekdaySlotCounts}
                />
                <FixedTimetableComparison
                  termId={termId}
                  requiredLessonCounts={requiredLessonCounts}
                  subjectCounts={subjectCounts}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
