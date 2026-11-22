import type {
  RestrictedAreaQueryParams,
  SiteQueryParams,
  ZoneQueryParams,
} from "@/types";

export const siteKeys = {
  all: ["sites"] as const,
  lists: () => [...siteKeys.all, "list"] as const,
  list: (params?: SiteQueryParams) => [...siteKeys.lists(), params] as const,
  details: () => [...siteKeys.all, "detail"] as const,
  detail: (id: string) => [...siteKeys.details(), id] as const,
  safetyConfigs: () => [...siteKeys.all, "safety-config"] as const,
  safetyConfig: (id: string) => [...siteKeys.safetyConfigs(), id] as const,
  systemDefaultSafetyConfig: () => [...siteKeys.all, "system-default-safety-config"] as const,
  effectiveSafetyConfigs: () => [...siteKeys.all, "effective-safety-config"] as const,
  effectiveSafetyConfig: (params: { siteId?: string; cameraId?: string }) =>
    [...siteKeys.all, "effective-safety-config", params] as const,
  cameraSafetyConfig: (cameraId: string) =>
    [...siteKeys.all, "camera-safety-config", cameraId] as const,
  zones: (siteId: string) => [...siteKeys.all, "zones", siteId] as const,
  allZones: (params?: ZoneQueryParams) => [...siteKeys.all, "all-zones", params] as const,
  restrictedAreas: (siteId: string) => [...siteKeys.all, "restricted-areas", siteId] as const,
  zoneRestrictedAreas: (zoneId: string) => [...siteKeys.all, "zone-restricted-areas", zoneId] as const,
  allRestrictedAreas: (params?: RestrictedAreaQueryParams) =>
    [...siteKeys.all, "all-restricted-areas", params] as const,
  complianceSummaryRoot: () => [...siteKeys.all, "compliance-summary"] as const,
  complianceSummary: (siteIds: string[]) =>
    [...siteKeys.all, "compliance-summary", siteIds] as const,
};
