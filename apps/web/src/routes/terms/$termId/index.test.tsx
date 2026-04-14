import { describe, it, expect, vi } from "vitest";
import { screen, within } from "@testing-library/react";

vi.mock("@packages/api/actions/terms", () => ({
  getTermDashboard: vi.fn(),
}));

import { renderRoute } from "@/test/render-route";
import { Route } from "./index";

type DashboardData = {
  term: { id: string; name: string; startsAtIso: string; endsAtIso: string };
  calendarDaysCount: number;
  requiredLessonCountsCount: number;
  fixedTimetableSlotsCount: number;
  fixedTimetableSlots: Array<{
    weekday: number;
    daySlotIndex: number;
    subjectId: string;
    subject: { id: string; name: string };
    name: string | null;
    note: string | null;
  }>;
  weekdaySlotCounts: Record<number, number>;
  requiredLessonCounts: Array<{
    subjectId: string;
    subjectName: string;
    requiredCount: number;
  }>;
  subjectCounts: Array<{ subjectId: string; count: number }>;
};

function buildDashboard(overrides: Partial<DashboardData> = {}): DashboardData {
  return {
    term: {
      id: "t1",
      name: "1学期",
      startsAtIso: "2025-04-07T00:00:00.000Z",
      endsAtIso: "2025-04-13T00:00:00.000Z",
    },
    calendarDaysCount: 0,
    requiredLessonCountsCount: 0,
    fixedTimetableSlotsCount: 0,
    fixedTimetableSlots: [],
    weekdaySlotCounts: { 1: 6, 2: 6, 3: 6, 4: 6, 5: 4 },
    requiredLessonCounts: [],
    subjectCounts: [],
    ...overrides,
  };
}

describe("TermDashboardPage", () => {
  it("学期名・期間・授業週数を表示する", () => {
    renderRoute(Route, { loaderData: buildDashboard() });

    expect(
      screen.getByRole("heading", { level: 1, name: "1学期" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2025-04-07 〜 2025-04-13")).toBeInTheDocument();
    expect(screen.getByText("1 週")).toBeInTheDocument();
  });

  it("進捗が未設定のときは未設定表示、設定済みのときは設定済み表示になる", () => {
    const { unmount } = renderRoute(Route, { loaderData: buildDashboard() });
    const untouched = screen.getAllByText("未設定");
    expect(untouched.length).toBeGreaterThanOrEqual(3);
    unmount();

    renderRoute(Route, {
      loaderData: buildDashboard({
        calendarDaysCount: 7,
        requiredLessonCountsCount: 3,
        fixedTimetableSlotsCount: 5,
      }),
    });
    expect(screen.getByText("設定済み")).toBeInTheDocument();
    expect(screen.getByText("設定済み (3科目)")).toBeInTheDocument();
    expect(screen.getByText("設定済み (5コマ)")).toBeInTheDocument();
  });

  it("固定時間割が登録されているとグリッドに科目名を表示する", () => {
    renderRoute(Route, {
      loaderData: buildDashboard({
        fixedTimetableSlotsCount: 1,
        fixedTimetableSlots: [
          {
            weekday: 1,
            daySlotIndex: 1,
            subjectId: "s1",
            subject: { id: "s1", name: "算数" },
            name: null,
            note: null,
          },
        ],
      }),
    });

    expect(screen.getByText("1 限")).toBeInTheDocument();
    expect(screen.getByText("算数")).toBeInTheDocument();
  });

  it("設定ページへのリンクを表示する", () => {
    renderRoute(Route, { loaderData: buildDashboard() });
    const settingsLink = screen.getByRole("link", { name: "設定を開く" });
    expect(settingsLink).toHaveAttribute("href", "/terms/t1/settings");
  });
});
