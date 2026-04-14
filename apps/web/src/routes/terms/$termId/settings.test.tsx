import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";

vi.mock("@packages/api/actions/terms", () => ({
  getTermSettings: vi.fn(),
}));

vi.mock("@/routes/terms/$termId/_components/settings-client", () => ({
  SettingsClient: (props: { termId: string; defaultOpenSection?: string }) => (
    <div
      data-testid="settings-client"
      data-term-id={props.termId}
      data-section={props.defaultOpenSection}
    />
  ),
}));

import { renderRoute } from "@/test/render-route";
import { Route } from "./settings";

const baseLoaderData = {
  term: {
    id: "t1",
    name: "1学期",
    startsAtIso: "2025-04-07T00:00:00.000Z",
    endsAtIso: "2025-04-13T00:00:00.000Z",
  },
  calendarDays: [],
  subjects: [],
  requiredLessonCounts: [],
  totalAvailableSlots: 30,
  fixedTimetableSlots: [],
  weekdaySlotCounts: { 1: 6, 2: 6, 3: 6, 4: 6, 5: 6 },
  subjectCounts: [],
};

describe("TermSettingsPage", () => {
  it("学期名と戻るリンクを表示する", () => {
    renderRoute(Route, { loaderData: baseLoaderData });

    expect(
      screen.getByRole("heading", { level: 1, name: "1学期" }),
    ).toBeInTheDocument();
    const backLink = screen.getByRole("link", {
      name: "学期ダッシュボードへ戻る",
    });
    expect(backLink).toHaveAttribute("href", "/terms/t1");
  });

  it("search.section がないときは calendar セクションをデフォルト展開する", () => {
    renderRoute(Route, { loaderData: baseLoaderData, search: {} });

    const settingsClient = screen.getByTestId("settings-client");
    expect(settingsClient).toHaveAttribute("data-term-id", "t1");
    expect(settingsClient).toHaveAttribute("data-section", "calendar");
  });

  it("search.section=fixedTimetable のときは fixedTimetable を展開する", () => {
    renderRoute(Route, {
      loaderData: baseLoaderData,
      search: { section: "fixedTimetable" },
    });

    expect(screen.getByTestId("settings-client")).toHaveAttribute(
      "data-section",
      "fixedTimetable",
    );
  });
});
