if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:80/api/v1";
}
if (!process.env.NEXT_PUBLIC_APP_URL) {
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
}

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/contexts/AuthContext";
import { LocaleProvider } from "@/providers/locale-provider";
import { AppSidebar } from "../app-sidebar";
import {
  SidebarBadge,
  SidebarCollapsedBadge,
} from "../sidebar-badge";

describe("SidebarBadge & SidebarCollapsedBadge", () => {
  it("renders nothing when badge is undefined or count is zero", () => {
    assert.equal(renderToStaticMarkup(<SidebarBadge badge={undefined} />), "");
    assert.equal(
      renderToStaticMarkup(
        <SidebarBadge
          badge={{ count: 0, variant: "danger", label: "0 chờ thẩm duyệt" }}
        />,
      ),
      "",
    );
    assert.equal(
      renderToStaticMarkup(<SidebarCollapsedBadge badge={undefined} />),
      "",
    );
  });

  it("renders count, 99+ cap, ON displayText, and accessible labels", () => {
    const pendingHtml = renderToStaticMarkup(
      <SidebarBadge
        badge={{
          count: 14,
          variant: "danger",
          label: "14 sự cố chờ thẩm duyệt",
          pulse: true,
        }}
      />,
    );
    assert.ok(pendingHtml.includes(">14<"));
    assert.ok(pendingHtml.includes('aria-label="14 sự cố chờ thẩm duyệt"'));
    assert.ok(pendingHtml.includes('title="14 sự cố chờ thẩm duyệt"'));
    assert.ok(pendingHtml.includes("animate-pulse"));

    const cappedHtml = renderToStaticMarkup(
      <SidebarBadge
        badge={{
          count: 150,
          variant: "danger",
          label: "150 thông báo chưa đọc",
        }}
      />,
    );
    assert.ok(cappedHtml.includes(">99+<"));

    const maintenanceHtml = renderToStaticMarkup(
      <SidebarBadge
        badge={{
          count: 1,
          displayText: "ON",
          variant: "accent",
          label: "Chế độ bảo trì đang bật",
        }}
      />,
    );
    assert.ok(maintenanceHtml.includes(">ON<"));
    assert.ok(maintenanceHtml.includes("bg-accent"));
  });

  it("caps collapsed sidebar badge at 9+", () => {
    const html = renderToStaticMarkup(
      <SidebarCollapsedBadge
        badge={{
          count: 12,
          variant: "danger",
          label: "12 sự cố chờ thẩm duyệt",
        }}
      />,
    );
    assert.ok(html.includes(">9+<"));
    assert.ok(html.includes('aria-label="12 sự cố chờ thẩm duyệt"'));
  });
});

describe("AppSidebar badge integration", () => {
  it("renders pending review and unread notification badges in sidebar items", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <LocaleProvider>
          <AuthContext.Provider
            value={{
              status: "authenticated",
              user: {
                id: "u-1",
                email: "admin@ppe.local",
                fullName: "Admin",
                role: "ADMIN",
                permissions: [
                  "PPE_INCIDENT_READ",
                  "PPE_CAMERA_READ",
                  "NOTIFICATION_READ",
                ],
                isActive: true,
                twoFactorEnabled: false,
                mustChangePassword: false,
                createdAt: "2026-01-01T00:00:00.000Z",
              } as any,
              setUser: () => {},
              logout: async () => {},
            }}
          >
            <AppSidebar
              badges={{
                incidents: {
                  count: 6,
                  variant: "danger",
                  label: "6 sự cố chờ thẩm duyệt",
                  pulse: true,
                },
                cameras: {
                  count: 2,
                  variant: "accent",
                  label: "2 camera mất kết nối",
                },
                notifications: {
                  count: 9,
                  variant: "danger",
                  label: "9 thông báo chưa đọc",
                },
              }}
            />
          </AuthContext.Provider>
        </LocaleProvider>
      </QueryClientProvider>,
    );

    assert.ok(html.includes('aria-label="6 sự cố chờ thẩm duyệt"'));
    assert.ok(html.includes('aria-label="2 camera mất kết nối"'));
    assert.ok(html.includes('aria-label="9 thông báo chưa đọc"'));
  });
});
