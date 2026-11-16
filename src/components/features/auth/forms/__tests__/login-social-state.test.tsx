import "@/hooks/auth/__tests__/setup";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { LocaleProvider } from "@/providers/locale-provider";
import { SYSTEM_CONFIG_KEYS } from "@/lib/system-config";
import type { SystemPublicConfig } from "@/types";
import { LoginForm } from "../login-form";
import { resolveSocialLoginSlotState } from "../login-social-state";

describe("login-social-state", () => {
  it("always returns loading before mount to keep SSR and hydration HTML identical", () => {
    const cachedConfig: SystemPublicConfig = {
      [SYSTEM_CONFIG_KEYS.socialLoginEnabled]: true,
    };

    assert.equal(
      resolveSocialLoginSlotState({
        mounted: false,
        isPending: false,
        isError: false,
        publicConfig: cachedConfig,
      }),
      "loading",
    );
  });

  it("returns loading while mounted and config is still pending without error", () => {
    assert.equal(
      resolveSocialLoginSlotState({
        mounted: true,
        isPending: true,
        isError: false,
        publicConfig: undefined,
      }),
      "loading",
    );
  });

  it("returns enabled or hidden according to feature.social_login.enabled after config loads", () => {
    assert.equal(
      resolveSocialLoginSlotState({
        mounted: true,
        isPending: false,
        isError: false,
        publicConfig: { [SYSTEM_CONFIG_KEYS.socialLoginEnabled]: true },
      }),
      "enabled",
    );

    assert.equal(
      resolveSocialLoginSlotState({
        mounted: true,
        isPending: false,
        isError: false,
        publicConfig: { [SYSTEM_CONFIG_KEYS.socialLoginEnabled]: false },
      }),
      "hidden",
    );
  });

  it("returns hidden when config query fails without cached data", () => {
    assert.equal(
      resolveSocialLoginSlotState({
        mounted: true,
        isPending: false,
        isError: true,
        publicConfig: undefined,
      }),
      "hidden",
    );
  });

  it("SSR renders fixed min-h-[76px] social-login-slot with skeleton placeholder in LoginForm", () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const mockRouter = {
      back: () => {},
      forward: () => {},
      refresh: () => {},
      push: () => {},
      replace: () => {},
      prefetch: async () => {},
      bfcacheId: "",
    };

    const html = renderToStaticMarkup(
      <AppRouterContext.Provider value={mockRouter}>
        <QueryClientProvider client={client}>
          <LocaleProvider>
            <LoginForm />
          </LocaleProvider>
        </QueryClientProvider>
      </AppRouterContext.Provider>,
    );

    assert.match(html, /data-testid="social-login-slot"/);
    assert.match(html, /min-h-\[76px\]/);
    assert.match(html, /ui-skeleton/);
    assert.match(html, /h-10 w-full/);
  });
});
