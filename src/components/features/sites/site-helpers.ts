import { userService } from "@/services/user.service";
import type { SiteContactOfficer, SiteItem } from "@/types";

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
 * Syncs `User.siteIds` when an Admin assigns officers with `userId` to a site.
 */
export async function syncSiteOfficersAccess(
  siteId: string,
  contactOfficers: SiteContactOfficer[] | undefined,
  isAdmin: boolean,
): Promise<void> {
  if (!siteId || !isAdmin || !contactOfficers?.length) return;
  const officerUserIds = contactOfficers
    .map((o) => o.userId)
    .filter((id): id is string => Boolean(id));
  if (officerUserIds.length === 0) return;

  try {
    await Promise.allSettled(
      officerUserIds.map(async (userId) => {
        const officerDetail = await userService.getUserById(userId);
        const currentSites = officerDetail.siteIds || [];
        if (!currentSites.includes(siteId)) {
          await userService.assignUserSites(userId, [...currentSites, siteId]);
        }
      }),
    );
  } catch (err) {
    console.warn("Could not auto-assign site to selected officers:", err);
  }
}
