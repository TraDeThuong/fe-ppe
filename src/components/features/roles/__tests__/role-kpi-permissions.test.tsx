import "@/hooks/auth/__tests__/setup";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/contexts/AuthContext";
import { userKeys } from "@/hooks/users";
import type { RoleDto, UserResponseDto } from "@/types";
import { RoleDetailKpiBar } from "../detail/role-detail-kpi-bar";
import { RoleStatsDetailPanel, type RoleStatKey } from "../role-stats-detail-panel";

const role: RoleDto = {
  id: "role-1",
  name: "SITE_AUDITOR",
  description: null,
  isSystem: false,
  userCount: 4,
  permissions: [],
  createdAt: "2026-10-01",
  updatedAt: "2026-10-01",
};

const member: UserResponseDto = {
  id: "user-2",
  email: "member@example.com",
  roleId: role.id,
  isActive: true,
  createdAt: "2026-10-01",
  updatedAt: "2026-10-01",
};

const noop = () => {};

function renderForViewer(element: ReactNode, permissions: string[], members: UserResponseDto[] = []) {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } });
  client.setQueryData([...userKeys.list({ roleName: role.name, limit: 100 }), "all"], { data: members });

  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <AuthContext.Provider
        value={{
          status: "authenticated",
          user: {
            id: "viewer",
            email: null,
            fullName: null,
            avatarUrl: null,
            phoneNumber: null,
            role: "CUSTOM_ROLE",
            roleId: "viewer-role",
            permissions,
            isActive: true,
            twoFactorEnabled: false,
            createdAt: "2026-10-01",
          },
          setUser: noop,
          logout: async () => {},
        }}
      >
        {element}
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

function renderPanel(activeStat: RoleStatKey, permissions: string[], members?: UserResponseDto[]) {
  return renderForViewer(
    <RoleStatsDetailPanel
      activeStat={activeStat}
      roles={[role]}
      totalPermissionsCount={0}
      onClose={noop}
      onCreateRole={noop}
      onConfigurePermissions={noop}
    />,
    permissions,
    members,
  );
}

describe("role KPI permissions", () => {
  it("shows the assigned total and a permission message without exposing cached users", () => {
    const denied = renderPanel("assignedUsers", ["ROLE_READ"], [member]);
    assert.match(denied, /Bạn chưa có quyền xem danh sách nhân sự/);
    assert.match(denied, /4 nhân sự/);
    assert.doesNotMatch(denied, /Chưa có người dùng nào|member@example\.com|href="\/users/);
  });

  it("keeps user links available to readers and reserves assignment for users with assignment permission", () => {
    const allowed = renderPanel("assignedUsers", ["USER_READ"], [member]);
    assert.match(allowed, /href="\/users\?role=SITE_AUDITOR"/);
    assert.match(allowed, /href="\/users\?search=member%40example\.com"/);
    assert.match(allowed, /href="\/users"/);

    const readOnly = renderPanel("assignedUsers", ["USER_READ"]);
    assert.match(readOnly, /Chưa có người dùng nào/);
    assert.doesNotMatch(readOnly, /Gán ngay/);
    assert.match(renderPanel("assignedUsers", ["USER_READ", "USER_ROLE_ASSIGN"]), /Gán ngay/);
  });

  it("displays each management action only with the matching permission", () => {
    assert.doesNotMatch(renderPanel("totalRoles", ["ROLE_PERMISSION_ASSIGN"]), /aria-label="Tạo vai trò"/);
    assert.match(renderPanel("totalRoles", ["ROLE_CREATE"]), /aria-label="Tạo vai trò"/);
    assert.doesNotMatch(renderPanel("totalPermissions", ["ROLE_CREATE"]), /aria-label="Ma trận quyền"/);
    assert.match(renderPanel("totalPermissions", ["ROLE_PERMISSION_ASSIGN"]), /aria-label="Ma trận quyền"/);
  });

  it("renders aggregate counts and permission messages only for the restricted detail cards", () => {
    const kpis = (
      <RoleDetailKpiBar
        role={role}
        totalPermissionsCount={10}
        assignedUsersCount={role.userCount}
        activeUsersCount={0}
        twoFactorUsersCount={0}
        accessiblePagesCount={3}
        totalPagesCount={14}
        auditLogsCount={0}
        onSelectTab={noop}
      />
    );

    const usersOnly = renderForViewer(kpis, ["USER_READ"]);
    assert.match(usersOnly, /0 hoạt động • 0 bật 2FA/);
    assert.match(usersOnly, />—</);
    assert.doesNotMatch(usersOnly, />sự kiện</);

    const auditOnly = renderForViewer(kpis, ["AUDIT_LOG_READ"]);
    assert.doesNotMatch(auditOnly, /0 hoạt động|bật 2FA/);
    assert.match(auditOnly, /Thiếu quyền xem chi tiết/);
    assert.match(auditOnly, />4<\/span>/);
    assert.match(auditOnly, />sự kiện</);
  });
});
