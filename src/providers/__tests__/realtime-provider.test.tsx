import "@/hooks/auth/__tests__/setup";
import assert from "node:assert/strict";
import { it } from "node:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { JSDOM } from "jsdom";
import { StrictMode, act } from "react";
import { createRoot } from "react-dom/client";
import { AuthContext } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/axios";
import { RealtimeProvider } from "../realtime-provider";

it("requests one ticket in Strict Mode and waits for Retry-After beyond the backoff cap", async (t) => {
  const dom = new JSDOM("<!doctype html><div id='root'></div>");
  const globals = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
  const originalGlobals = {
    window: globals.window,
    document: globals.document,
    IS_REACT_ACT_ENVIRONMENT: globals.IS_REACT_ACT_ENVIRONMENT,
  };
  Object.assign(globals, {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  });

  const originalAdapter = apiClient.defaults.adapter;
  const requestSignals: typeof apiClient.defaults.signal[] = [];
  apiClient.defaults.adapter = async (config) => {
    requestSignals.push(config.signal);
    throw new AxiosError("Too Many Requests", "ERR_BAD_REQUEST", config, undefined, {
      status: 429,
      statusText: "Too Many Requests",
      headers: { "retry-after": "120" },
      config,
      data: { success: false, code: "RATE_LIMIT_EXCEEDED" },
    });
  };

  const queryClient = new QueryClient();
  const root = createRoot(dom.window.document.getElementById("root")!);
  t.mock.timers.enable({ apis: ["setTimeout"] });

  try {
    await act(async () => {
      root.render(
        <StrictMode>
          <QueryClientProvider client={queryClient}>
            <AuthContext.Provider value={{
              user: null,
              status: "authenticated",
              setUser: () => {},
              logout: async () => {},
            }}>
              <RealtimeProvider>{null}</RealtimeProvider>
            </AuthContext.Provider>
          </QueryClientProvider>
        </StrictMode>,
      );
    });
    assert.equal(requestSignals.length, 1);

    await act(async () => t.mock.timers.tick(119_999));
    assert.equal(requestSignals.length, 1);
    await act(async () => t.mock.timers.tick(1));
    assert.equal(requestSignals.length, 2);
  } finally {
    await act(async () => root.unmount());
    queryClient.clear();
    apiClient.defaults.adapter = originalAdapter;
    Object.assign(globals, originalGlobals);
    dom.window.close();
  }

  assert.equal(requestSignals[1]?.aborted, true);
  t.mock.timers.tick(120_000);
  assert.equal(requestSignals.length, 2);
});
