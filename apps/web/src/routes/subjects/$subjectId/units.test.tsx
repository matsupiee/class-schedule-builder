import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";

vi.mock("@packages/api/actions/subject-units", () => ({
  getSubjectWithUnits: vi.fn(),
  createSubjectUnit: vi.fn(),
  updateSubjectUnit: vi.fn(),
  deleteSubjectUnit: vi.fn(),
  reorderSubjectUnits: vi.fn(),
}));

vi.mock("@/routes/subjects/$subjectId/_components/subject-units-client", () => ({
  SubjectUnitsClient: (props: {
    subjectId: string;
    subjectName: string;
    initialUnits: Array<{ id: string }>;
  }) => (
    <div
      data-testid="subject-units-client"
      data-subject-id={props.subjectId}
      data-subject-name={props.subjectName}
      data-units-count={props.initialUnits.length}
    />
  ),
}));

import { renderRoute } from "@/test/render-route";
import { Route } from "./units";

const baseSubject = {
  id: "s1",
  name: "算数",
  subjectUnits: [
    { id: "u1", unitName: "たし算", slotCount: 2, order: 0 },
    { id: "u2", unitName: "ひき算", slotCount: 3, order: 1 },
  ],
};

describe("SubjectUnitsPage", () => {
  it("パンくずと科目名を表示する", () => {
    renderRoute(Route, { loaderData: baseSubject });

    expect(
      screen.getByRole("heading", { level: 1, name: "算数：単元管理" }),
    ).toBeInTheDocument();
    const breadcrumb = screen.getByRole("link", { name: "科目一覧" });
    expect(breadcrumb).toHaveAttribute("href", "/subjects");
  });

  it("科目一覧へ戻るリンクを表示する", () => {
    renderRoute(Route, { loaderData: baseSubject });
    const backLink = screen.getByRole("link", { name: "科目一覧へ戻る" });
    expect(backLink).toHaveAttribute("href", "/subjects");
  });

  it("SubjectUnitsClient に初期単元を渡す", () => {
    renderRoute(Route, { loaderData: baseSubject });

    const client = screen.getByTestId("subject-units-client");
    expect(client).toHaveAttribute("data-subject-id", "s1");
    expect(client).toHaveAttribute("data-subject-name", "算数");
    expect(client).toHaveAttribute("data-units-count", "2");
  });
});
