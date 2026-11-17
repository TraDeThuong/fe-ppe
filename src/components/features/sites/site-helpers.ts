import { userService } from "@/services/user.service";
import type { SiteContactOfficer, SiteItem, UserResponseDto } from "@/types";

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
 * Syncs `User.siteIds` when an Admin assigns or removes officers with `userId` on a site.
 */
export async function syncSiteOfficersAccess(
  siteId: string,
  contactOfficers: SiteContactOfficer[] | undefined,
  isAdmin: boolean,
  previousOfficers?: SiteContactOfficer[] | null,
): Promise<void> {
  if (!siteId || !isAdmin) return;

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

  const toAdd = Array.from(nextUserIds);
  const toRemove = Array.from(prevUserIds).filter((id) => !nextUserIds.has(id));

  if (toAdd.length === 0 && toRemove.length === 0) return;

  try {
    await Promise.allSettled([
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
  } catch (err) {
    console.warn("Could not auto-sync site access for officers:", err);
  }
}
