import "@/hooks/auth/__tests__/setup";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/providers/theme-provider";
import { LocaleProvider } from "@/providers/locale-provider";
import { AuthContext, type AuthContextValue } from "@/contexts/AuthContext";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { NotFoundView } from "../not-found-view";
import type { MeDto } from "@/types/auth.types";

const MOCK_AUTH_USER: MeDto = {
  id: "user-404",
  email: "inspector@ppe.local",
  fullName: "Đoàn Thanh Tra",
  role: "ADMIN",
  roleId: "role-admin",
  permissions: ["*"],
  avatarUrl: null,
  phoneNumber: null,
  isActive: true,
  mustChangePassword: false,
  twoFactorEnabled: false,
  createdAt: "2026-01-01T00:00:00Z",
};

const mockAppRouter: any = {
  back: () => {},
  forward: () => {},
  refresh: () => {},
  push: () => {},
  replace: () => {},
  prefetch: () => {},
};

function renderNotFound(
  mode: "fullscreen" | "shell" | "auto" = "auto",
  authContext?: Partial<AuthContextValue>,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  const authValue: AuthContextValue = {
    user: authContext?.user ?? null,
    status: authContext?.status ?? "unauthenticated",
    setUser: () => {},
    logout: async () => {},
    ...authContext,
  };

  return renderToString(
    React.createElement(
      ThemeProvider,
      null,
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(
          LocaleProvider,
          null,
          React.createElement(
            AuthContext.Provider,
            { value: authValue },
            React.createElement(
              AppRouterContext.Provider,
              { value: mockAppRouter },
              React.createElement(NotFoundView, { mode }),
            ),
          ),
        ),
      ),
    ),
  );
}

describe("NotFoundView Component Suite", () => {
  it("renders 404 code badge and main title", () => {
    const html = renderNotFound("fullscreen");

    assert.ok(html.includes("404"), "Includes 404 error code");
    assert.ok(
      html.includes("Không tìm thấy trang") || html.includes("Page not found"),
      "Includes not found headline",
    );
  });

  it("renders fullscreen header with Smart PPE branding and language toggle in fullscreen mode", () => {
    const html = renderNotFound("fullscreen");

    assert.ok(html.includes("Smart PPE"), "Includes Smart PPE brand in header");
    assert.ok(html.includes("VI") || html.includes("EN"), "Includes language toggle");
    assert.ok(html.includes("theme-toggle-btn"), "Includes theme toggle");
  });

  it("renders unauthenticated actions when user is guest", () => {
    const html = renderNotFound("fullscreen", {
      user: null,
      status: "unauthenticated",
    });

    assert.ok(
      html.includes("/login"),
      "Includes login link for guest",
    );
    assert.ok(
      html.includes("Về Trang chủ") || html.includes("Back to Home"),
      "Includes Back to Home button for unauthenticated visitor",
    );
  });

  it("renders authenticated actions when user is logged in", () => {
    const html = renderNotFound("shell", {
      user: MOCK_AUTH_USER,
      status: "authenticated",
    });

    assert.ok(
      html.includes("/dashboard"),
      "Includes dashboard link for authenticated user",
    );
    assert.ok(
      html.includes("Về Bảng điều khiển") || html.includes("Back to Dashboard"),
      "Includes Back to Dashboard button",
    );
  });

  it("renders 4 quick navigation shortcut cards (Dashboard, Cameras, Incidents, Sites)", () => {
    const html = renderNotFound("fullscreen");

    assert.ok(html.includes("/dashboard"), "Contains shortcut to /dashboard");
    assert.ok(html.includes("/cameras"), "Contains shortcut to /cameras");
    assert.ok(html.includes("/incidents"), "Contains shortcut to /incidents");
    assert.ok(html.includes("/sites"), "Contains shortcut to /sites");
  });

  it("renders help and support contact note", () => {
    const html = renderNotFound("fullscreen");

    assert.ok(
      html.includes("Cần hỗ trợ") || html.includes("Need technical assistance"),
      "Includes support help section",
    );
  });
});
