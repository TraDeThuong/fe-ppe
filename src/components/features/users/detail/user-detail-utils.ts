import type {
  CameraItem,
  IncidentItem,
  SiteContactOfficer,
  SiteItem,
  UserResponseDto,
} from "@/types";

export type PerformanceTier =
  | "EXCELLENT"
  | "GOOD"
  | "AVERAGE"
  | "NEEDS_IMPROVEMENT"
  | "UNRATED";

export interface UserIncidentStats {
  totalIncidents: number;
  resolvedIncidents: number;
  dismissedIncidents: number;
  pendingIncidents: number;
  criticalIncidents: number;
  resolutionRate: number;
  mttrHours: number;
  slaComplianceRate: number;
  hasSlaData: boolean;
  performanceTier: PerformanceTier;
}

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
 * Matches a user against a site's `contactOfficers` list, prioritizing exact `userId` match
 * before falling back to phone number or normalized name matching.
 */
export function findMatchingContactOfficer(
  site: SiteItem,
  user: Pick<UserResponseDto, "id" | "fullName" | "phoneNumber">,
): SiteContactOfficer | undefined {
  const officers = parseContactOfficers(site.contactOfficers);
  if (officers.length === 0) return undefined;

  const byUserId = officers.find((o) => o.userId && o.userId === user.id);
  if (byUserId) return byUserId;

  const normalizedUserPhone = user.phoneNumber?.replace(/\s+/g, "").trim();
  if (normalizedUserPhone) {
    const byPhone = officers.find(
      (o) =>
        Array.isArray(o.phones) &&
        o.phones.some((p) => p.replace(/\s+/g, "").trim() === normalizedUserPhone),
    );
    if (byPhone) return byPhone;
  }

  const normalizedUserName = user.fullName?.trim().toLowerCase();
  if (normalizedUserName) {
    return officers.find((o) => {
      const officerName = o.name?.trim().toLowerCase();
      if (!officerName) return false;
      return (
        officerName === normalizedUserName ||
        officerName.includes(normalizedUserName) ||
        normalizedUserName.includes(officerName)
      );
    });
  }

  return undefined;
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

/**
 * Filters incidents relevant to the user (direct assignment, status history actor, or assigned site)
 * and enriches missing `siteName` / `cameraName` from catalog maps.
 */
export function correlateUserIncidents(
  allIncidents: IncidentItem[],
  user: Pick<UserResponseDto, "id" | "email"> | undefined,
  userSiteIds: Set<string>,
  siteMap: Map<string, SiteItem>,
  cameraMap: Map<string, CameraItem>,
): IncidentItem[] {
  if (!user) return [];

  return allIncidents
    .filter((inc) => {
      const hasDirectAssignment = inc.assignments?.some(
        (a) => a.assignedTo === user.id || (user.email && a.assignedToEmail === user.email),
      );
      if (hasDirectAssignment) return true;

      const hasHistoryAction = inc.statusHistory?.some((h) => h.changedBy === user.id);
      if (hasHistoryAction) return true;

      return userSiteIds.has(inc.siteId);
    })
    .map((inc) => {
      const site = siteMap.get(inc.siteId);
      const camera = cameraMap.get(inc.cameraId);
      return {
        ...inc,
        siteName: inc.siteName || site?.name,
        cameraName: inc.cameraName || camera?.name,
        cameraCode: inc.cameraCode || camera?.code,
      };
    });
}

/**
 * Computes consistent incident & SLA KPIs for a user across Overview, KPI Bar, Incidents, and Performance tabs.
 */
export function computeUserIncidentStats(userIncidents: IncidentItem[]): UserIncidentStats {
  const total = userIncidents.length;
  const resolved = userIncidents.filter(
    (i) => i.status === "RESOLVED" || i.status === "CLOSED",
  ).length;
  const dismissed = userIncidents.filter((i) => i.status === "DISMISSED").length;
  const pending = userIncidents.filter(
    (i) => i.status !== "RESOLVED" && i.status !== "CLOSED" && i.status !== "DISMISSED",
  ).length;
  const critical = userIncidents.filter((i) => i.severity === "CRITICAL").length;

  const actionableTotal = total - dismissed;
  const resolutionRate =
    actionableTotal > 0
      ? Math.round((resolved / actionableTotal) * 100)
      : total > 0
        ? 100
        : 0;

  let totalResolveDurationHours = 0;
  let resolvedWithDurationCount = 0;
  let slaComplianceCount = 0;

  for (const inc of userIncidents) {
    if ((inc.status === "RESOLVED" || inc.status === "CLOSED") && inc.resolvedAt) {
      const start = new Date(inc.detectedAt).getTime();
      const end = new Date(inc.resolvedAt).getTime();
      const diffHours = (end - start) / (1000 * 60 * 60);

      if (Number.isFinite(diffHours) && diffHours >= 0 && diffHours < 720) {
        totalResolveDurationHours += diffHours;
        resolvedWithDurationCount += 1;

        const maxAllowed = inc.severity === "CRITICAL" ? 2 : 24;
        if (diffHours <= maxAllowed) {
          slaComplianceCount += 1;
        }
      }
    }
  }

  const hasSlaData = resolvedWithDurationCount > 0;
  const avgMttr = hasSlaData
    ? Math.round((totalResolveDurationHours / resolvedWithDurationCount) * 10) / 10
    : 0;
  const slaRate = hasSlaData
    ? Math.round((slaComplianceCount / resolvedWithDurationCount) * 100)
    : 0;

  let tier: PerformanceTier = "UNRATED";
  if (total === 0) {
    tier = "UNRATED";
  } else if (resolutionRate >= 90 && (slaRate >= 85 || !hasSlaData)) {
    tier = "EXCELLENT";
  } else if (resolutionRate >= 75) {
    tier = "GOOD";
  } else if (resolutionRate >= 50) {
    tier = "AVERAGE";
  } else {
    tier = "NEEDS_IMPROVEMENT";
  }

  return {
    totalIncidents: total,
    resolvedIncidents: resolved,
    dismissedIncidents: dismissed,
    pendingIncidents: pending,
    criticalIncidents: critical,
    resolutionRate,
    mttrHours: avgMttr,
    slaComplianceRate: slaRate,
    hasSlaData,
    performanceTier: tier,
  };
}
