// Helper cho các test cần sự kiện DOM thật (ảnh tải lỗi, đổi select). Không phải file test.
import "@/hooks/auth/__tests__/setup";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { AuthContext } from "@/contexts/AuthContext";
import { LocaleProvider } from "@/providers/locale-provider";

const noop = () => {};

const PERMISSIONS = [
  "PPE_INCIDENT_READ",
  "PPE_INCIDENT_REVIEW",
  "PPE_INCIDENT_UPDATE",
  "PPE_INCIDENT_MANAGE",
];

export function withProviders(element: React.ReactElement, client = newQueryClient()) {
  const router = { push: noop, replace: noop, refresh: noop, back: noop, forward: noop, prefetch: noop };
  return (
    <AppRouterContext.Provider value={router as never}>
      <QueryClientProvider client={client}>
        <LocaleProvider>
          <AuthContext.Provider
            value={{
              status: "authenticated",
              user: { id: "u1", role: "ADMIN", permissions: PERMISSIONS } as never,
              setUser: noop,
              logout: async () => {},
            }}
          >
            {element}
          </AuthContext.Provider>
        </LocaleProvider>
      </QueryClientProvider>
    </AppRouterContext.Provider>
  );
}

function newQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
}

export interface DomContext {
  body: HTMLElement;
  window: JSDOM["window"];
  /** Chờ effect, promise của react-query và re-render xong. */
  settle: () => Promise<void>;
  act: (run: () => void) => Promise<void>;
}

export async function renderWithDom(
  element: React.ReactElement,
  run: (context: DomContext) => Promise<void>,
  /** `desktop`: media query trả `matches = true`, để trang chọn bố cục desktop thay vì mobile. */
  { desktop = false }: { desktop?: boolean } = {},
) {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:3000" });
  const Observer = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  const globals: Record<string, unknown> = {
    self: dom.window,
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Element: dom.window.Element,
    Node: dom.window.Node,
    localStorage: dom.window.localStorage,
    sessionStorage: dom.window.sessionStorage,
    requestAnimationFrame: (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0),
    cancelAnimationFrame: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
    MutationObserver: dom.window.MutationObserver,
    ResizeObserver: Observer,
    IntersectionObserver: Observer,
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  const previous = Object.fromEntries(
    Object.keys(globals).map((key) => [key, Reflect.get(globalThis, key)]),
  );
  Object.assign(globalThis, globals);
  Object.assign(dom.window, {
    matchMedia: () => ({ matches: desktop, addEventListener: noop, removeEventListener: noop }),
  });

  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  const client = newQueryClient();
  const settle = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
  };

  try {
    await act(async () => root.render(withProviders(element, client)));
    await settle();
    await run({
      body: dom.window.document.body,
      window: dom.window,
      settle,
      act: async (work) => {
        await act(async () => work());
        await settle();
      },
    });
  } finally {
    await act(async () => root.unmount());
    client.clear();
    Object.assign(globalThis, previous);
    dom.window.close();
  }
}
