import "@/hooks/auth/__tests__/setup";
import assert from "node:assert/strict";
import { it, mock } from "node:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { JSDOM } from "jsdom";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { authKeys } from "@/hooks/auth/auth.query-keys";
import { usePublicConfig } from "@/hooks/auth/use-public-config";
import { ApiError } from "@/lib/axios";
import { SYSTEM_CONFIG_KEYS } from "@/lib/system-config";
import { authService, integrationService } from "@/services";
import { ErrorCode } from "@/types";
import { useIntegrationMutations } from "../use-integrations";

it("keeps feature.webhooks.enabled = false after FEATURE_DISABLED even when /system/public omits the flag", async () => {
  const dom = new JSDOM("<div id='root'></div>", { pretendToBeVisual: true });
  const globals = {
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  const previousGlobals = Object.fromEntries(
    Object.keys(globals).map((key) => [key, Reflect.get(globalThis, key)]),
  );
  Object.assign(globalThis, globals);

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // Public config của user thiếu SYSTEM_CONFIG_READ: chưa có cờ webhook (trước BE #13)
  client.setQueryData(authKeys.config(), { "app.name": "Smart PPE" });
  const getPublicConfig = mock.method(authService, "getPublicConfig", async () => ({
    "app.name": "Smart PPE",
  }));
  const testPing = mock.method(integrationService, "testPingWebhook", async () => {
    throw new ApiError(403, ErrorCode.FEATURE_DISABLED, "Tính năng Webhook hiện đang tạm khóa");
  });

  let mutations: ReturnType<typeof useIntegrationMutations>;
  function Probe() {
    // Trang integrations luôn có observer usePublicConfig đang hoạt động
    usePublicConfig();
    mutations = useIntegrationMutations();
    return null;
  }
  const root = createRoot(dom.window.document.getElementById("root")!);
  try {
    await act(async () => {
      root.render(
        <QueryClientProvider client={client}>
          <Probe />
        </QueryClientProvider>,
      );
    });
    await act(async () => {
      await mutations!.testPingWebhook.mutateAsync("wh-1").catch(() => {});
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    const config = client.getQueryData<Record<string, unknown>>(authKeys.config());
    assert.equal(config?.[SYSTEM_CONFIG_KEYS.webhooksEnabled], false);
    assert.equal(config?.["app.name"], "Smart PPE");
    assert.equal(getPublicConfig.mock.callCount(), 0);
  } finally {
    act(() => root.unmount());
    client.clear();
    getPublicConfig.mock.restore();
    testPing.mock.restore();
    Object.assign(globalThis, previousGlobals);
  }
});
