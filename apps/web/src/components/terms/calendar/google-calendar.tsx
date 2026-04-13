import { useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type GoogleCalendarProps = {
  startDate: string;
  endDate: string;
  calendarDays?: Array<{ date: string; title: string | null; dayType: string }>;
  selectedDate?: Date;
  onSelectDate?: (date: Date) => void;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export function GoogleCalendar({
  startDate,
  endDate,
  calendarDays = [],
  selectedDate,
  onSelectDate,
}: GoogleCalendarProps) {
  const startDateObj = useMemo(() => {
    const parsed = new Date(startDate);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [startDate]);
  const endDateObj = useMemo(() => {
    const parsed = new Date(endDate);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [endDate]);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    if (today >= startDateObj && today <= endDateObj) {
      return new Date(today.getFullYear(), today.getMonth(), 1);
    }
    return new Date(startDateObj.getFullYear(), startDateObj.getMonth(), 1);
  });

  const calendarDaysMap = useMemo(() => {
    const map = new Map<string, { title: string | null; dayType: string }>();
    for (const day of calendarDays) {
      map.set(day.date.slice(0, 10), { title: day.title, dayType: day.dayType });
    }
    return map;
  }, [calendarDays]);

  const formatDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const isToday = (date: Date) => isSameDay(date, new Date());

  const calendarGrid = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const days: Array<Date | null> = [];
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i));
    }
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push(new Date(year, month + 1, day));
    }
    return days;
  }, [currentMonth]);

  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      if (newMonth < startDateObj) {
        return new Date(startDateObj.getFullYear(), startDateObj.getMonth(), 1);
      }
      return newMonth;
    });
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      if (newMonth > endDateObj) {
        return new Date(endDateObj.getFullYear(), endDateObj.getMonth(), 1);
      }
      return newMonth;
    });
  };

  const goToToday = () => {
    const today = new Date();
    if (today >= startDateObj && today <= endDateObj) {
      setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    } else {
      setCurrentMonth(
        new Date(startDateObj.getFullYear(), startDateObj.getMonth(), 1),
      );
    }
  };

  const isInTermRange = (date: Date) =>
    date >= startDateObj && date <= endDateObj;
  const isCurrentMonth = (date: Date) =>
    date.getMonth() === currentMonth.getMonth();
  const monthYearLabel = `${currentMonth.getFullYear()}年${currentMonth.getMonth() + 1}月`;

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
            className="text-sm"
          >
            今日
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPreviousMonth}
              disabled={
                new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth() - 1,
                  1,
                ) <
                new Date(startDateObj.getFullYear(), startDateObj.getMonth(), 1)
              }
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextMonth}
              disabled={
                new Date(
                  currentMonth.getFullYear(),
                  currentMonth.getMonth() + 1,
                  1,
                ) >
                new Date(endDateObj.getFullYear(), endDateObj.getMonth(), 1)
              }
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-lg font-medium">{monthYearLabel}</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="bg-muted/50 grid grid-cols-7 border-b">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-muted-foreground p-2 text-center text-sm font-medium"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {calendarGrid.map((date, index) => {
            if (!date) return null;
            const dateKey = formatDateKey(date);
            const dayData = calendarDaysMap.get(dateKey);
            const title = dayData?.title;
            const dayType = dayData?.dayType;
            const isSelected = selectedDate && isSameDay(date, selectedDate);
            const isTodayDate = isToday(date);
            const inRange = isInTermRange(date);
            const inCurrentMonth = isCurrentMonth(date);

            const getDayTypeColor = () => {
              switch (dayType) {
                case "WEEKLY_OFF":
                  return "bg-slate-100 text-slate-700";
                case "HOLIDAY":
                  return "bg-amber-100 text-amber-900";
                case "SCHOOL_EVENT":
                  return "bg-rose-100 text-rose-900";
                default:
                  return "";
              }
            };

            return (
              <button
                key={index}
                type="button"
                onClick={() => {
                  if (inRange && onSelectDate) onSelectDate(date);
                }}
                disabled={!inRange}
                className={cn(
                  "relative min-h-[80px] border-r border-b p-2 text-left transition-colors last:border-r-0",
                  "hover:bg-muted/50 focus:ring-ring focus:ring-2 focus:ring-offset-1 focus:outline-none",
                  "flex flex-col items-start",
                  !inCurrentMonth && "bg-muted/30",
                  !inRange && "cursor-not-allowed opacity-50",
                  isSelected && "bg-primary/10",
                )}
              >
                <div
                  className={cn(
                    "mb-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium",
                    isSelected && "bg-primary text-primary-foreground",
                    !isSelected &&
                      isTodayDate &&
                      "bg-accent text-accent-foreground",
                    !isSelected && !isTodayDate && "text-foreground",
                  )}
                >
                  {date.getDate()}
                </div>
                {title && (
                  <div
                    className={cn(
                      "w-full truncate rounded px-1.5 py-0.5 text-[10px]",
                      dayType
                        ? getDayTypeColor()
                        : "bg-green-100 text-green-900",
                    )}
                  >
                    {title}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
