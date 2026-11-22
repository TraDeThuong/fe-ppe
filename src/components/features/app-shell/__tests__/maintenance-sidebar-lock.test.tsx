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
import {
  getVisibleNavItems,
  isFullMaintenanceMode,
  isMaintenanceBypassed,
  isNavItemActive,
  NAV_ITEMS,
  ROUTE_ANY_PERMISSIONS,
} from "@/config/navigation";
import { AppSidebar } from "../app-sidebar";

describe("isFullMaintenanceMode", () => {
  it("returns true only when enabled is true and status is MAINTENANCE", () => {
    assert.equal(
      isFullMaintenanceMode({ enabled: true, status: "MAINTENANCE" }),
      true,
    );
    assert.equal(
      isFullMaintenanceMode({ enabled: true, status: "READ_ONLY" }),
      false,
    );
    assert.equal(
      isFullMaintenanceMode({ enabled: false, status: "MAINTENANCE" }),
      false,
    );
    assert.equal(
      isFullMaintenanceMode({ enabled: false, status: "ONLINE" }),
      false,
    );
    assert.equal(isFullMaintenanceMode(null), false);
  });
});

describe("getVisibleNavItems maintenance lock", () => {
  it("keeps only /maintenance when maintenanceLocked is true for ADMIN or MAINTENANCE_MANAGE", () => {
    const adminItems = getVisibleNavItems(["PPE_INCIDENT_READ", "USER_READ"], {
      maintenanceLocked: true,
      role: "ADMIN",
    });
    assert.deepEqual(
      adminItems.map((i) => i.route),
      ["/maintenance"],
    );

    const managerItems = getVisibleNavItems(
      ["MAINTENANCE_MANAGE", "USER_READ"],
      {
        maintenanceLocked: true,
        role: "MANAGER",
      },
    );
    assert.deepEqual(
      managerItems.map((i) => i.route),
      ["/maintenance"],
    );

    const noPermItems = getVisibleNavItems(["PPE_INCIDENT_READ"], {
      maintenanceLocked: true,
      role: "USER",
    });
    assert.deepEqual(noPermItems, []);
  });

  it("keeps normal sidebar items when maintenanceLocked is false (e.g. READ_ONLY)", () => {
    const items = getVisibleNavItems(
      ["PPE_INCIDENT_READ", "MAINTENANCE_MANAGE"],
      {
        maintenanceLocked: false,
        role: "ADMIN",
      },
    );
    assert.ok(items.some((i) => i.route === "/dashboard"));
    assert.ok(items.some((i) => i.route === "/incidents"));
    assert.ok(items.some((i) => i.route === "/maintenance"));
  });
});

describe("AppSidebar maintenanceLocked rendering", () => {
  const renderSidebar = (maintenanceLocked: boolean) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    return renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <LocaleProvider>
          <AuthContext.Provider
            value={{
              status: "authenticated",
              user: {
                id: "u-admin",
                email: "admin@ppe.local",
                fullName: "Admin",
                role: "ADMIN",
                permissions: [
                  "PPE_INCIDENT_READ",
                  "PPE_CAMERA_READ",
                  "USER_READ",
                  "MAINTENANCE_MANAGE",
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
            <AppSidebar badges={{}} maintenanceLocked={maintenanceLocked} />
          </AuthContext.Provider>
        </LocaleProvider>
      </QueryClientProvider>,
    );
  };

  it("renders only /maintenance link and points logo to /maintenance when maintenanceLocked=true", () => {
    const html = renderSidebar(true);
    assert.ok(html.includes('href="/maintenance"'));
    assert.equal(html.includes('href="/dashboard"'), false);
    assert.equal(html.includes('href="/incidents"'), false);
    assert.equal(html.includes('href="/users"'), false);
    assert.equal(html.includes('href="/"'), false);
  });

  it("renders normal navigation links when maintenanceLocked=false", () => {
    const html = renderSidebar(false);
    assert.ok(html.includes('href="/dashboard"'));
    assert.ok(html.includes('href="/incidents"'));
    assert.ok(html.includes('href="/users"'));
    assert.ok(html.includes('href="/maintenance"'));
  });
});

describe("navigation helpers (activePrefix, maintenance bypass, MAINTENANCE_READ)", () => {
  it("highlights Settings nav item on both /settings/profile and /settings/security", () => {
    const settingsItem = NAV_ITEMS.find((i) => i.key === "settings")!;
    assert.equal(isNavItemActive("/settings/profile", settingsItem, NAV_ITEMS), true);
    assert.equal(isNavItemActive("/settings/security", settingsItem, NAV_ITEMS), true);
    assert.equal(isNavItemActive("/dashboard", settingsItem, NAV_ITEMS), false);
  });

  it("allows MAINTENANCE_READ users to see /maintenance in sidebar and ROUTE_ANY_PERMISSIONS", () => {
    assert.deepEqual(ROUTE_ANY_PERMISSIONS["/maintenance"], [
      "MAINTENANCE_READ",
      "MAINTENANCE_MANAGE",
    ]);
    const items = getVisibleNavItems(["MAINTENANCE_READ"], {
      maintenanceLocked: false,
      role: "USER",
    });
    assert.ok(items.some((i) => i.route === "/maintenance"));
  });

  it("checks isMaintenanceBypassed for ADMIN, SUPER_ADMIN, and MAINTENANCE_MANAGE", () => {
    assert.equal(isMaintenanceBypassed({ role: "ADMIN", permissions: [] }), true);
    assert.equal(isMaintenanceBypassed({ role: "SUPER_ADMIN", permissions: [] }), true);
    assert.equal(
      isMaintenanceBypassed({ role: "MANAGER", permissions: ["MAINTENANCE_MANAGE"] }),
      true,
    );
    assert.equal(
      isMaintenanceBypassed({ role: "USER", permissions: ["MAINTENANCE_READ"] }),
      false,
    );
  });
});
