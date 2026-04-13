-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Term" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WeeklyDayRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "termId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "defaultSlotCount" INTEGER NOT NULL,
    CONSTRAINT "WeeklyDayRule_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CalendarDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "termId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "title" TEXT,
    "dayType" TEXT NOT NULL,
    "slotCount" INTEGER NOT NULL,
    CONSTRAINT "CalendarDay_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RequiredLessonCount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "termId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "requiredCount" INTEGER NOT NULL,
    CONSTRAINT "RequiredLessonCount_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RequiredLessonCount_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FixedTimetableSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "termId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "daySlotIndex" INTEGER NOT NULL,
    "subjectId" TEXT NOT NULL,
    "name" TEXT,
    "note" TEXT,
    CONSTRAINT "FixedTimetableSlot_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FixedTimetableSlot_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SubjectUnit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subjectId" TEXT NOT NULL,
    "unitName" TEXT NOT NULL,
    "slotCount" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "SubjectUnit_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActualTimetableSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "termId" TEXT NOT NULL,
    "calendarDayId" TEXT NOT NULL,
    "daySlotIndex" INTEGER NOT NULL,
    "subjectId" TEXT,
    "subjectUnitId" TEXT,
    "unitSlotIndex" INTEGER,
    "disabledReason" TEXT,
    CONSTRAINT "ActualTimetableSlot_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ActualTimetableSlot_calendarDayId_fkey" FOREIGN KEY ("calendarDayId") REFERENCES "CalendarDay" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ActualTimetableSlot_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ActualTimetableSlot_subjectUnitId_fkey" FOREIGN KEY ("subjectUnitId") REFERENCES "SubjectUnit" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyDayRule_termId_weekday_key" ON "WeeklyDayRule"("termId", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarDay_termId_date_key" ON "CalendarDay"("termId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "RequiredLessonCount_termId_subjectId_key" ON "RequiredLessonCount"("termId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "FixedTimetableSlot_termId_weekday_daySlotIndex_key" ON "FixedTimetableSlot"("termId", "weekday", "daySlotIndex");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectUnit_subjectId_order_key" ON "SubjectUnit"("subjectId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ActualTimetableSlot_termId_calendarDayId_daySlotIndex_key" ON "ActualTimetableSlot"("termId", "calendarDayId", "daySlotIndex");

