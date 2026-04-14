import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { resetRouteState } from "./route-mocks";

afterEach(() => {
  cleanup();
  resetRouteState();
});

vi.mock("@tanstack/react-router", async () => {
  const { createRouterMock } = await import("./route-mocks");
  return createRouterMock();
});
