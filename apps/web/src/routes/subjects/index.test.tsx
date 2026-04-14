import { describe, it, expect, vi } from "vitest";
import { screen, within } from "@testing-library/react";

vi.mock("@packages/api/actions/subjects", () => ({
  listSubjects: vi.fn(),
  createSubject: vi.fn(),
}));

import { renderRoute } from "@/test/render-route";
import { Route } from "./index";

type Subject = {
  id: string;
  name: string;
  unitCount: number;
  createdAtIso: string;
};

describe("SubjectsPage", () => {
  it("科目が空のときに空状態のメッセージを表示する", () => {
    renderRoute(Route, { loaderData: [] as Subject[] });

    expect(
      screen.getByRole("heading", { level: 1, name: "科目一覧" }),
    ).toBeInTheDocument();
    expect(screen.getByText("0 件")).toBeInTheDocument();
    expect(
      screen.getByText("まだ科目が登録されていません。"),
    ).toBeInTheDocument();
  });

  it("科目一覧と単元ページへのリンクを表示する", () => {
    const subjects: Subject[] = [
      {
        id: "s1",
        name: "算数",
        unitCount: 3,
        createdAtIso: "2025-04-01T00:00:00.000Z",
      },
      {
        id: "s2",
        name: "国語",
        unitCount: 0,
        createdAtIso: "2025-04-02T00:00:00.000Z",
      },
    ];
    renderRoute(Route, { loaderData: subjects });

    expect(screen.getByText("2 件")).toBeInTheDocument();

    const sansuuRow = screen.getByText("算数").closest("tr")!;
    const unitLink = within(sansuuRow).getByRole("link", {
      name: /単元管理/,
    });
    expect(unitLink).toHaveAttribute("href", "/subjects/s1/units");
    expect(unitLink).toHaveTextContent("単元管理（3）");

    const kokugoRow = screen.getByText("国語").closest("tr")!;
    expect(
      within(kokugoRow).getByRole("link", { name: /単元管理/ }),
    ).toHaveTextContent("単元管理（0）");
  });
});
