/**
 * Contract Site & Spatial Management theo Backend smart-ppe-site-service.
 * Nguồn đối chiếu:
 * - Prisma Schema: smart-ppe-site-service/prisma/schema.prisma
 * - DTOs & Validation: smart-ppe-site-service/src/modules/site/site.dto.ts
 * - Routes: smart-ppe-site-service/src/modules/site/site.route.ts
 */

import type { PaginationMeta } from "./rbac.types";

// ============================================================================
// 1. CONSTANTS & ENUMS
// ============================================================================

export const SITE_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  COMPLETED: "COMPLETED",
  ARCHIVED: "ARCHIVED",
  SUSPENDED: "SUSPENDED",
} as const;

export type SiteStatus = (typeof SITE_STATUS)[keyof typeof SITE_STATUS];

export const ZONE_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  MAINTENANCE: "MAINTENANCE",
} as const;

export type ZoneStatus = (typeof ZONE_STATUS)[keyof typeof ZONE_STATUS];

export const RESTRICTED_AREA_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;

export type RestrictedAreaStatus =
  (typeof RESTRICTED_AREA_STATUS)[keyof typeof RESTRICTED_AREA_STATUS];

// ============================================================================
// 2. DTOs
// ============================================================================

export interface ZoneItem {
  id: string;
  siteId: string;
  name: string;
  code: string;
  description?: string | null;
  status: ZoneStatus | string;
  cameraCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RestrictedAreaPoint {
  x: number;
  y: number;
}

export interface RestrictedAreaItem {
  id: string;
  siteId: string;
  zoneId?: string | null;
  zoneName?: string;
  name: string;
  description?: string | null;
  boundary: RestrictedAreaPoint[] | unknown;
  status: RestrictedAreaStatus | string;
  severity?: "CRITICAL" | "HIGH" | "MEDIUM";
  createdAt: string;
  updatedAt: string;
}

export interface SiteSafetyConfigItem {
  id: string;
  siteId: string;
  confidenceThreshold: number;
  confirmationDuration: number;
  cooldownDuration: number;
  enableNoHelmet: boolean;
  enableNoVest: boolean;
  enableRestrictedArea: boolean;
  modelVersionId?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SiteContactOfficer {
  userId?: string;
  name: string;
  roleTitle?: string;
  phones: string[];
}

export interface SiteItem {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  description?: string | null;
  status: SiteStatus;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
  zones?: ZoneItem[];
  safetyConfigs?: SiteSafetyConfigItem[];
  restrictedAreas?: RestrictedAreaItem[];
  cameraCount?: number;
  zoneCount?: number;
  restrictedAreaCount?: number;
  complianceRate?: number;
  contactPerson?: string;
  contactPhone?: string;
  contactOfficers?: SiteContactOfficer[];
  _count?: {
    zones?: number;
    restrictedAreas?: number;
    cameras?: number;
  };
}

// ============================================================================
// 3. QUERY & MUTATION PAYLOADS
// ============================================================================

export interface SiteQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: SiteStatus | string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface CreateSitePayload {
  name: string;
  code: string;
  address?: string;
  description?: string;
  status?: SiteStatus;
  startDate?: string;
  endDate?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactOfficers?: SiteContactOfficer[];
}

export interface UpdateSitePayload {
  name?: string;
  code?: string;
  address?: string;
  description?: string;
  status?: SiteStatus;
  startDate?: string | null;
  endDate?: string | null;
  contactPerson?: string;
  contactPhone?: string;
  contactOfficers?: SiteContactOfficer[];
}

export interface CreateZonePayload {
  name: string;
  code: string;
  description?: string;
  status?: ZoneStatus;
}

export interface CreateRestrictedAreaPayload {
  zoneId?: string | null;
  name: string;
  description?: string;
  boundary?: RestrictedAreaPoint[];
  status?: RestrictedAreaStatus;
  severity?: "CRITICAL" | "HIGH" | "MEDIUM";
}

export interface UpdateSiteSafetyConfigPayload {
  confidenceThreshold?: number;
  confirmationDuration?: number;
  cooldownDuration?: number;
  enableNoHelmet?: boolean;
  enableNoVest?: boolean;
  enableRestrictedArea?: boolean;
}

export interface SiteListResponse {
  data: SiteItem[];
  meta: PaginationMeta;
}
