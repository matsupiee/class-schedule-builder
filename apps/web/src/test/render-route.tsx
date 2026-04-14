import { render, type RenderResult } from "@testing-library/react";
import { setLoaderData, setParams, setSearch } from "./route-mocks";

type RouteLike = {
  component?: React.ComponentType | (() => React.ReactElement);
};

type RenderRouteOptions = {
  loaderData?: unknown;
  search?: Record<string, unknown>;
  params?: Record<string, string>;
};

export function renderRoute(
  route: RouteLike,
  options: RenderRouteOptions = {},
): RenderResult {
  if (options.loaderData !== undefined) setLoaderData(options.loaderData);
  if (options.search !== undefined) setSearch(options.search);
  if (options.params !== undefined) setParams(options.params);
  const Component = route.component as React.ComponentType;
  if (!Component) throw new Error("route has no component");
  return render(<Component />);
}
