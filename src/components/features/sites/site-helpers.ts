import {
  buildExistingCodeSet,
  generateRandomToken,
  generateUniqueEntityCode,
} from "@/lib/code-generator";
import { userService } from "@/services/user.service";
import type { SiteContactOfficer, SiteItem, UserResponseDto } from "@/types";

export const SITE_SAFETY_RULE_LIMITS = {
  MIN_CONFIRMATION_DURATION: 1,
  MAX_CONFIRMATION_DURATION: 60,
  DEFAULT_HELMET_CONFIRMATION_DURATION: 2,
  DEFAULT_VEST_CONFIRMATION_DURATION: 4,
} as const;

export function clampSiteConfirmationDuration(
  value: number | null | undefined,
  fallback: number,
): number {
  const num = Number(value);
  if (value == null || !Number.isFinite(num)) {
    return fallback;
  }
  const clamped = Math.min(
    SITE_SAFETY_RULE_LIMITS.MAX_CONFIRMATION_DURATION,
    Math.max(SITE_SAFETY_RULE_LIMITS.MIN_CONFIRMATION_DURATION, num),
  );
  return Number(clamped.toFixed(1));
}

export function resolveSiteConfirmationDurations(
  source?: {
    helmetConfirmationDuration?: number | null;
    confirmationDuration?: number | null;
    vestConfirmationDuration?: number | null;
  } | null,
): {
  helmetConfirmationDuration: number;
  vestConfirmationDuration: number;
} {
  const rawHelmet =
    source?.helmetConfirmationDuration ?? source?.confirmationDuration;
  const helmetConfirmationDuration = clampSiteConfirmationDuration(
    rawHelmet,
    SITE_SAFETY_RULE_LIMITS.DEFAULT_HELMET_CONFIRMATION_DURATION,
  );
  // Đọc độc lập vestConfirmationDuration (mặc định 4.0s, không fallback sang confirmationDuration)
  const vestConfirmationDuration = clampSiteConfirmationDuration(
    source?.vestConfirmationDuration,
    SITE_SAFETY_RULE_LIMITS.DEFAULT_VEST_CONFIRMATION_DURATION,
  );

  return {
    helmetConfirmationDuration,
    vestConfirmationDuration,
  };
}

export function groupUsersBySafetyRole(allUsers: readonly UserResponseDto[]) {
  const managers: UserResponseDto[] = [];
  const officers: UserResponseDto[] = [];
  const others: UserResponseDto[] = [];

  for (const u of allUsers) {
    const roleName = (u.role?.name || "").toUpperCase();
    if (roleName === "SAFETY_MANAGER" || roleName === "MANAGER" || roleName === "ADMIN") {
      managers.push(u);
    } else if (roleName === "SAFETY_OFFICER" || roleName.includes("SAFETY") || roleName.includes("OFFICER")) {
      officers.push(u);
    } else {
      others.push(u);
    }
  }

  return { managers, officers, others };
}

export function suggestSiteRoleTitle(
  roleName: string | undefined,
  isVietnamese: boolean,
): string | null {
  const upper = (roleName || "").toUpperCase();
  if (upper === "SAFETY_MANAGER" || upper === "MANAGER") {
    return isVietnamese ? "Trưởng ban an toàn (Lead)" : "Lead Safety Officer";
  }
  if (upper === "SAFETY_OFFICER") {
    return isVietnamese ? "Cán bộ giám sát an toàn (Officer)" : "Safety Supervision Officer";
  }
  return null;
}

/**
 * Safely parses `site.contactOfficers` whether it arrives as an array or JSON string.
 */
export function parseSiteContactOfficers(
  raw: SiteItem["contactOfficers"] | string | null | undefined,
): SiteContactOfficer[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Resolves displayable officers, falling back to legacy `contactPerson` / `contactPhone`.
 */
export function resolveDisplayOfficers(
  site: Pick<SiteItem, "contactOfficers" | "contactPerson" | "contactPhone">,
  fallbackRoleTitle: string,
): SiteContactOfficer[] {
  const officers = parseSiteContactOfficers(site.contactOfficers);
  if (officers.length > 0) return officers;
  if (!site.contactPerson) return [];
  const phones = site.contactPhone
    ? site.contactPhone
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean)
    : [];
  return [
    {
      name: site.contactPerson,
      roleTitle: fallbackRoleTitle,
      phones,
    },
  ];
}

/**
 * Converts a Vietnamese zone name into an ASCII BE-safe code matching `/^[A-Z0-9_-]+$/i`.
 */
export function normalizeZoneCode(name: string): string {
  const ascii = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const suffix = ascii || "AREA";
  return suffix.startsWith("ZONE-") ? suffix.slice(0, 50) : `ZONE-${suffix}`.slice(0, 50);
}

/**
 * Generates a unique zone code that does not collide with `existingCodes` in the site.
 * - If `forceRandom` is false and `name` is provided, tries `normalizeZoneCode(name)` first
 *   and appends a random suffix if that code is already taken.
 * - If `forceRandom` is true or `name` is blank, generates a fresh random zone code.
 */
export function generateUniqueZoneCode(
  name?: string,
  existingCodes?: Iterable<string>,
  forceRandom = false,
): string {
  const existingSet = buildExistingCodeSet(existingCodes);
  const trimmedName = (name || "").trim();

  if (!forceRandom && trimmedName) {
    const base = normalizeZoneCode(trimmedName);
    if (!existingSet.has(base.toUpperCase())) {
      return base;
    }
    for (let i = 0; i < 30; i++) {
      const token = generateRandomToken(4);
      const maxBaseLen = Math.max(4, 50 - 1 - token.length);
      const candidate = `${base.slice(0, maxBaseLen).replace(/-+$/g, "")}-${token}`;
      if (!existingSet.has(candidate.toUpperCase())) {
        return candidate;
      }
    }
  }

  return generateUniqueEntityCode({
    prefix: "ZONE",
    nameHint: trimmedName,
    existingCodes: existingSet,
    separator: "-",
    randomLength: 4,
    alwaysIncludeRandomSuffix: true,
  });
}

/**
 * Formats an ISO or Date string into `YYYY-MM-DD` for date inputs & BE DTOs.
 */
export function toDateInputValue(value?: string | null): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

/**
 * Checks whether a user role has global administrative privileges.
 */
export function isAdminRole(role?: string | null): boolean {
  const normalized = (role || "").trim().toUpperCase();
  return normalized === "ADMIN" || normalized === "SUPER_ADMIN";
}

/**
 * Determines whether the current user is permitted to synchronize officer `User.siteIds`
 * across `smart-ppe-identity-service`.
 */
export function canSyncSiteOfficers(
  role?: string | null,
  hasUserPermissions?: boolean,
): boolean {
  if (typeof hasUserPermissions === "boolean") {
    return hasUserPermissions || isAdminRole(role);
  }
  return isAdminRole(role);
}

/**
 * Syncs `User.siteIds` when an authorized user assigns or removes officers with `userId` on a site.
 */
export async function syncSiteOfficersAccess(
  siteId: string,
  contactOfficers: SiteContactOfficer[] | undefined,
  canSyncOrRole: boolean | string | null | undefined,
  previousOfficers?: SiteContactOfficer[] | null,
): Promise<{ synced: number; failed: number }> {
  const canSync =
    typeof canSyncOrRole === "boolean"
      ? canSyncOrRole
      : isAdminRole(canSyncOrRole);
  if (!siteId || !canSync) return { synced: 0, failed: 0 };

  const nextUserIds = new Set(
    (contactOfficers || [])
      .map((o) => o.userId)
      .filter((id): id is string => Boolean(id)),
  );
  const prevUserIds = new Set(
    (previousOfficers || [])
      .map((o) => o.userId)
      .filter((id): id is string => Boolean(id)),
  );

  const toAdd =
    previousOfficers !== undefined && previousOfficers !== null
      ? Array.from(nextUserIds).filter((id) => !prevUserIds.has(id))
      : Array.from(nextUserIds);
  const toRemove = Array.from(prevUserIds).filter((id) => !nextUserIds.has(id));

  if (toAdd.length === 0 && toRemove.length === 0) {
    return { synced: 0, failed: 0 };
  }

  const results = await Promise.allSettled([
    ...toAdd.map(async (userId) => {
      const officerDetail = await userService.getUserById(userId);
      const currentSites = officerDetail.siteIds || [];
      if (!currentSites.includes(siteId)) {
        await userService.assignUserSites(userId, [...currentSites, siteId]);
      }
    }),
    ...toRemove.map(async (userId) => {
      const officerDetail = await userService.getUserById(userId);
      const currentSites = officerDetail.siteIds || [];
      if (currentSites.includes(siteId)) {
        await userService.assignUserSites(
          userId,
          currentSites.filter((id) => id !== siteId),
        );
      }
    }),
  ]);

  let synced = 0;
  let failed = 0;
  for (const res of results) {
    if (res.status === "fulfilled") {
      synced += 1;
    } else {
      failed += 1;
      console.warn("Could not auto-sync site access for officer:", res.reason);
    }
  }

  return { synced, failed };
}
