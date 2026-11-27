import type {
  SiteContactOfficer,
  SiteItem,
  UserResponseDto,
} from "@/types";

export interface UserSiteAssignmentInfo {
  userSites: SiteItem[];
  explicitSiteIdSet: Set<string>;
  contactOfficerSiteIdSet: Set<string>;
  combinedSiteIdSet: Set<string>;
}

/**
 * Safely parses `site.contactOfficers` whether it arrives as an array or a JSON string.
 */
export function parseContactOfficers(raw: unknown): SiteContactOfficer[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter((item): item is SiteContactOfficer => Boolean(item && typeof item === "object"));
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is SiteContactOfficer => Boolean(item && typeof item === "object"))
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Matches a user against a site's `contactOfficers` list strictly by `userId`.
 */
export function findMatchingContactOfficer(
  site: SiteItem,
  user: Pick<UserResponseDto, "id" | "fullName" | "phoneNumber">,
): SiteContactOfficer | undefined {
  const officers = parseContactOfficers(site.contactOfficers);
  if (officers.length === 0) return undefined;

  return officers.find((o) => Boolean(o.userId && o.userId === user.id));
}

/**
 * Resolves the user's display role title at a given construction site.
 */
export function getSiteRoleDetails(
  site: SiteItem,
  user: Pick<UserResponseDto, "id" | "fullName" | "phoneNumber" | "role">,
  isVietnamese: boolean,
): { roleTitle: string; isSpecific: boolean; contactPhones: string[] } {
  const matched = findMatchingContactOfficer(site, user);
  const roleName = user.role?.name || "USER";

  if (matched?.roleTitle) {
    return {
      roleTitle: matched.roleTitle,
      isSpecific: true,
      contactPhones: Array.isArray(matched.phones) ? matched.phones : [],
    };
  }

  let fallbackTitle: string;
  if (roleName === "ADMIN" || roleName === "SUPER_ADMIN") {
    fallbackTitle = isVietnamese ? "Quản trị viên toàn quyền hệ thống" : "Full System Administrator";
  } else if (roleName === "SAFETY_MANAGER") {
    fallbackTitle = isVietnamese ? "Chỉ huy trưởng an toàn công trường" : "Site Safety Manager";
  } else if (roleName === "SAFETY_OFFICER") {
    fallbackTitle = isVietnamese ? "Cán bộ giám sát an toàn PPE" : "Safety Officer";
  } else if (roleName === "SUPERVISOR") {
    fallbackTitle = isVietnamese ? "Giám sát viên hiện trường" : "Field Supervisor";
  } else {
    fallbackTitle = isVietnamese ? "Nhân sự an toàn công trường" : "Site Safety Personnel";
  }

  return {
    roleTitle: fallbackTitle,
    isSpecific: false,
    contactPhones: Array.isArray(matched?.phones) ? matched.phones : [],
  };
}

/**
 * Correlates construction sites assigned to a user from both `user.siteIds` (Identity service)
 * and `site.contactOfficers[].userId` (Site service).
 */
export function getUserAssignedSites(
  user: Pick<UserResponseDto, "id" | "siteIds"> | undefined,
  allSites: SiteItem[],
): UserSiteAssignmentInfo {
  const explicitSiteIdSet = new Set<string>(user?.siteIds ?? []);
  const contactOfficerSiteIdSet = new Set<string>();

  if (!user) {
    return {
      userSites: [],
      explicitSiteIdSet,
      contactOfficerSiteIdSet,
      combinedSiteIdSet: new Set<string>(),
    };
  }

  for (const site of allSites) {
    const officers = parseContactOfficers(site.contactOfficers);
    if (officers.some((o) => o.userId === user.id)) {
      contactOfficerSiteIdSet.add(site.id);
    }
  }

  const combinedSiteIdSet = new Set<string>([...explicitSiteIdSet, ...contactOfficerSiteIdSet]);
  const userSites = allSites.filter((s) => combinedSiteIdSet.has(s.id));

  return {
    userSites,
    explicitSiteIdSet,
    contactOfficerSiteIdSet,
    combinedSiteIdSet,
  };
}
