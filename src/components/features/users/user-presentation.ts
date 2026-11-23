import type { RoleDto, UserResponseDto } from "@/types";

export type UserAccountStatus = "deleted" | "locked" | "active" | "inactive";

export interface RoleBadgeStyle {
  badgeClass: string;
}

export interface RoleFilterItem {
  value: string;
  label: string;
  count?: number;
  isSystem?: boolean;
}

/** Thứ tự phân cấp chuẩn của các vai trò hệ thống trên thanh lọc nhanh */
export const SYSTEM_ROLE_ORDER: readonly string[] = [
  "ADMIN",
  "SUPER_ADMIN",
  "SAFETY_MANAGER",
  "SAFETY_OFFICER",
  "MANAGER",
  "USER",
];

const ADMIN_ROLE_STYLE: RoleBadgeStyle = {
  badgeClass: "border-primary/30 bg-primary/10 text-primary",
};

const NEUTRAL_ROLE_STYLE: RoleBadgeStyle = {
  badgeClass: "border-border/60 bg-background/70 text-foreground/85",
};

/** Trả về style tối giản, đồng nhất theo tông Neumorphic (chỉ nhấn nhẹ primary cho ADMIN) */
export function getRoleBadgeStyle(roleName?: string | null): RoleBadgeStyle {
  const normalized = (roleName || "USER").trim().toUpperCase();
  if (normalized === "ADMIN" || normalized === "SUPER_ADMIN") {
    return ADMIN_ROLE_STYLE;
  }
  return NEUTRAL_ROLE_STYLE;
}

/** Xác định trạng thái chuẩn hóa của tài khoản người dùng */
export function getUserAccountStatus(
  user: Pick<UserResponseDto, "isActive" | "lockedUntil" | "deletedAt">,
  now: Date = new Date(),
): UserAccountStatus {
  if (user.deletedAt) return "deleted";
  if (user.lockedUntil) {
    const lockedUntilMs = new Date(user.lockedUntil).getTime();
    if (Number.isFinite(lockedUntilMs) && lockedUntilMs > now.getTime()) {
      return "locked";
    }
  }
  return user.isActive ? "active" : "inactive";
}

/** Lấy chữ cái viết tắt hiển thị cho avatar dự phòng */
export function getUserInitials(
  user: Pick<UserResponseDto, "fullName" | "email">,
): string {
  const name = user.fullName?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  }
  const email = user.email?.trim();
  if (email) return email.charAt(0).toUpperCase();
  return "U";
}

export interface BuildRoleFilterItemsParams {
  roles: Pick<RoleDto, "id" | "name" | "isSystem" | "userCount">[];
  allLabel: string;
  activeRole?: string;
  summaryTotal?: number;
  roleCounts?: Record<string, number>;
}

/**
 * Xây dựng danh sách pill lọc nhanh theo vai trò:
 * - Pill đầu tiên là "all" (kèm tổng số user toàn hệ thống nếu có).
 * - Các vai trò hệ thống sắp theo thứ tự phân cấp `SYSTEM_ROLE_ORDER`, sau đó là vai trò tùy chỉnh (A -> Z).
 * - Tự động bổ sung các vai trò chỉ xuất hiện trong `roleCounts` hoặc `activeRole` (deep-link `?role=...`).
 */
export function buildRoleFilterItems({
  roles,
  allLabel,
  activeRole = "all",
  summaryTotal,
  roleCounts,
}: BuildRoleFilterItemsParams): RoleFilterItem[] {
  const roleMap = new Map<
    string,
    { name: string; isSystem: boolean; count?: number }
  >();

  for (const role of roles) {
    if (!role.name) continue;
    const countFromSummary = roleCounts?.[role.name];
    const count =
      typeof countFromSummary === "number"
        ? countFromSummary
        : typeof role.userCount === "number"
          ? role.userCount
          : undefined;
    roleMap.set(role.name, {
      name: role.name,
      isSystem: Boolean(role.isSystem),
      count,
    });
  }

  if (roleCounts) {
    for (const [roleName, count] of Object.entries(roleCounts)) {
      if (!roleName || roleMap.has(roleName)) continue;
      roleMap.set(roleName, {
        name: roleName,
        isSystem: SYSTEM_ROLE_ORDER.includes(roleName.toUpperCase()),
        count,
      });
    }
  }

  if (activeRole && activeRole !== "all" && !roleMap.has(activeRole)) {
    roleMap.set(activeRole, {
      name: activeRole,
      isSystem: SYSTEM_ROLE_ORDER.includes(activeRole.toUpperCase()),
      count: roleCounts?.[activeRole],
    });
  }

  const sortedRoles = Array.from(roleMap.values()).sort((a, b) => {
    const idxA = SYSTEM_ROLE_ORDER.indexOf(a.name.toUpperCase());
    const idxB = SYSTEM_ROLE_ORDER.indexOf(b.name.toUpperCase());
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.name.localeCompare(b.name);
  });

  const fallbackRoleSum = sortedRoles.reduce(
    (sum, item) => sum + (typeof item.count === "number" ? item.count : 0),
    0,
  );
  const hasAnyRoleCount = sortedRoles.some((item) => typeof item.count === "number");
  const totalCount =
    typeof summaryTotal === "number"
      ? summaryTotal
      : hasAnyRoleCount
        ? fallbackRoleSum
        : undefined;

  return [
    {
      value: "all",
      label: allLabel,
      count: totalCount,
    },
    ...sortedRoles.map((role) => ({
      value: role.name,
      label: role.name,
      count: role.count,
      isSystem: role.isSystem,
    })),
  ];
}
