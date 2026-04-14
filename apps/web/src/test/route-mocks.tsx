import type { ReactNode, AnchorHTMLAttributes } from "react";
import { vi } from "vitest";

type RouteState = {
  loaderData: unknown;
  search: Record<string, unknown>;
  params: Record<string, string>;
};

const state: RouteState = {
  loaderData: undefined,
  search: {},
  params: {},
};

export function setLoaderData(data: unknown) {
  state.loaderData = data;
}

export function setSearch(search: Record<string, unknown>) {
  state.search = search;
}

export function setParams(params: Record<string, string>) {
  state.params = params;
}

export function resetRouteState() {
  state.loaderData = undefined;
  state.search = {};
  state.params = {};
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  to?: string;
  params?: Record<string, string>;
  search?: Record<string, unknown>;
  children?: ReactNode;
};

function resolveHref(props: LinkProps) {
  if (typeof props.to !== "string") return "#";
  let href = props.to;
  if (props.params) {
    for (const [key, value] of Object.entries(props.params)) {
      href = href.replace(`$${key}`, String(value));
    }
  }
  return href;
}

function Link({ to, params, search, children, ...rest }: LinkProps) {
  return (
    <a href={resolveHref({ to, params, search })} {...rest}>
      {children}
    </a>
  );
}

const routerStub = {
  invalidate: vi.fn(async () => {}),
  navigate: vi.fn(async () => {}),
  history: { push: vi.fn(), replace: vi.fn() },
  state: { location: { pathname: "/" } },
};

export function createRouterMock() {
  return {
    createFileRoute:
      (_path: string) =>
      (config: Record<string, unknown>) => ({
        ...config,
        useLoaderData: () => state.loaderData,
        useSearch: () => state.search,
        useParams: () => state.params,
      }),
    createRootRoute:
      () =>
      (config: Record<string, unknown>) => ({
        ...config,
        useLoaderData: () => state.loaderData,
      }),
    Link,
    useRouter: () => routerStub,
    useRouterState: ({
      select,
    }: {
      select?: (s: { location: { pathname: string } }) => unknown;
    } = {}) =>
      select
        ? select({ location: { pathname: "/" } })
        : { location: { pathname: "/" } },
    notFound: () => new Error("notFound"),
    Outlet: () => null,
    HeadContent: () => null,
    Scripts: () => null,
  };
}
