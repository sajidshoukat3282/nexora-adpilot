import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";

/**
 * Minimal client-side router. Deliberately small — react-router-dom isn't
 * available offline in this environment (see engineering brief discussion).
 * Supports: static + ":param" segments, query strings, Link, useNavigate,
 * useParams, useSearchParams. That covers everything Phase 1 needs.
 */

interface RouteMatch {
  params: Record<string, string>;
}

interface RouterContextValue {
  path: string;
  search: string;
  navigate: (to: string) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

function getCurrentPath(): string {
  return window.location.hash.replace(/^#/, "") || "/";
}

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [full, setFull] = useState(getCurrentPath());

  useEffect(() => {
    const onHashChange = () => setFull(getCurrentPath());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = useCallback((to: string) => {
    window.location.hash = to;
  }, []);

  const [path, search] = useMemo(() => {
    const [p, s] = full.split("?");
    return [p || "/", s ? `?${s}` : ""];
  }, [full]);

  const value = useMemo(() => ({ path, search, navigate }), [path, search, navigate]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
};

function useRouterContext(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("Router hooks must be used inside <RouterProvider>");
  return ctx;
}

export function useNavigate() {
  const { navigate } = useRouterContext();
  return navigate;
}

export function useSearchParams(): [URLSearchParams, (updates: Record<string, string | null>) => void] {
  const { search, path, navigate } = useRouterContext();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(search);
      for (const [k, v] of Object.entries(updates)) {
        if (v === null) next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      navigate(qs ? `${path}?${qs}` : path);
    },
    [search, path, navigate]
  );
  return [params, setParams];
}

function matchPath(pattern: string, path: string): RouteMatch | null {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = path.split("/").filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    const pp = patternParts[i];
    if (pp.startsWith(":")) {
      params[pp.slice(1)] = decodeURIComponent(pathParts[i]);
    } else if (pp !== pathParts[i]) {
      return null;
    }
  }
  return { params };
}

const ParamsContext = createContext<Record<string, string>>({});
export function useParams(): Record<string, string> {
  return useContext(ParamsContext);
}

export interface RouteDef {
  path: string;
  element: React.ReactNode;
}

export const Routes: React.FC<{ routes: RouteDef[]; notFound?: React.ReactNode }> = ({ routes, notFound }) => {
  const { path } = useRouterContext();
  for (const route of routes) {
    const match = matchPath(route.path, path);
    if (match) {
      return <ParamsContext.Provider value={match.params}>{route.element}</ParamsContext.Provider>;
    }
  }
  return <>{notFound ?? null}</>;
};

export const Link: React.FC<
  { to: string; className?: string; children: React.ReactNode; onClick?: () => void }
> = ({ to, className, children, onClick }) => {
  const { navigate } = useRouterContext();
  return (
    <a
      href={`#${to}`}
      className={className}
      onClick={(e: React.MouseEvent) => {
        e.preventDefault();
        onClick?.();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
};

export function useCurrentPath(): string {
  const { path } = useRouterContext();
  return path;
}
