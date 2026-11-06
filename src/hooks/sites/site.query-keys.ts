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
  zones: (siteId: string) => [...siteKeys.all, "zones", siteId] as const,
  allZones: (params?: ZoneQueryParams) => [...siteKeys.all, "all-zones", params] as const,
  restrictedAreas: (siteId: string) => [...siteKeys.all, "restricted-areas", siteId] as const,
  allRestrictedAreas: (params?: RestrictedAreaQueryParams) =>
    [...siteKeys.all, "all-restricted-areas", params] as const,
};
