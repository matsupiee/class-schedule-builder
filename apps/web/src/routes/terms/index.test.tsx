import { describe, it, expect, vi } from "vitest";
import { screen, within } from "@testing-library/react";

vi.mock("@packages/api/actions/terms", () => ({
  listTerms: vi.fn(),
  createTerm: vi.fn(),
}));

import { renderRoute } from "@/test/render-route";
import { Route } from "./index";

type Term = {
  id: string;
  name: string;
  startsAtIso: string;
  endsAtIso: string;
};

describe("TermsPage", () => {
  it("学期が空のときに空状態のメッセージを表示する", () => {
    renderRoute(Route, { loaderData: [] as Term[] });

    expect(
      screen.getByRole("heading", { level: 1, name: "学期一覧" }),
    ).toBeInTheDocument();
    expect(screen.getByText("0 件")).toBeInTheDocument();
    expect(
      screen.getByText("まだ学期が登録されていません。"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "学期を新規作成" }),
    ).toBeInTheDocument();
  });

  it("学期一覧と各行の詳細ページへのリンクを表示する", () => {
    const terms: Term[] = [
      {
        id: "t1",
        name: "1学期",
        startsAtIso: "2025-04-07T00:00:00.000Z",
        endsAtIso: "2025-04-13T00:00:00.000Z",
      },
      {
        id: "t2",
        name: "2学期",
        startsAtIso: "2025-09-01T00:00:00.000Z",
        endsAtIso: "2025-09-14T00:00:00.000Z",
      },
    ];
    renderRoute(Route, { loaderData: terms });

    expect(screen.getByText("2 件")).toBeInTheDocument();

    const row1 = screen.getByText("1学期").closest("tr")!;
    expect(row1).toBeInTheDocument();
    const row1Links = within(row1).getAllByRole("link");
    for (const link of row1Links) {
      expect(link).toHaveAttribute("href", "/terms/t1");
    }
    expect(within(row1).getByText("1 週")).toBeInTheDocument();

    const row2 = screen.getByText("2学期").closest("tr")!;
    expect(within(row2).getByText("2 週")).toBeInTheDocument();
  });
});
