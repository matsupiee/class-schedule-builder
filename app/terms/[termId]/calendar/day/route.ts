import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma/prisma";

function toUtcDate(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map((value) => Number(value));
  if (!year || !month || !day) {
    return null;
  }
  return new Date(Date.UTC(year, month - 1, day));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ termId: string }> }
) {
  const { termId } = await params;
  const url = new URL(_request.url);
  const dateValue = url.searchParams.get("date") ?? "";
  const date = toUtcDate(dateValue);

  if (!date) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }

  const calendarDay = await prisma.calendarDay.findFirst({
    where: { termId, date },
    include: { actualTimetableSlots: true },
  });

  if (!calendarDay) {
    return NextResponse.json({ data: null });
  }

  return NextResponse.json({
    data: {
      dayType: calendarDay.dayType,
      slotCount: calendarDay.slotCount,
      title: calendarDay.title,
      daySlots: calendarDay.actualTimetableSlots.map((slot) => ({
        daySlotIndex: slot.daySlotIndex,
        disabledReason: slot.disabledReason,
      })),
    },
  });
}
