import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderRoute } from "@/test/render-route";
import { Route } from "./index";

describe("HomePage", () => {
  it("タイトルと移行中メッセージを表示する", () => {
    renderRoute(Route);
    expect(
      screen.getByRole("heading", { level: 1, name: "時間割作成" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Cloudflare Workers + D1 + TanStack Start に移行中です。",
      ),
    ).toBeInTheDocument();
  });

  it("学期・科目への導線リンクを表示する", () => {
    renderRoute(Route);
    const termsLink = screen.getByRole("link", { name: "学期へ" });
    const subjectsLink = screen.getByRole("link", { name: "科目へ" });
    expect(termsLink).toHaveAttribute("href", "/terms");
    expect(subjectsLink).toHaveAttribute("href", "/subjects");
  });
});
