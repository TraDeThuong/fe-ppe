export type MaintenanceModeStatus = "ONLINE" | "MAINTENANCE" | "READ_ONLY";

export interface MaintenanceConfig {
  id: string;
  key: string;
  enabled: boolean;
  status: MaintenanceModeStatus;
  title: string;
  message: string;
  startAt: string | null;
  estimatedEndAt: string | null;
  bypassPermissions: string[];
  bypassRoles: string[];
  bypassIps: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PublicMaintenanceStatus {
  enabled: boolean;
  status: MaintenanceModeStatus;
  title: string;
  message: string;
  startAt: string | null;
  estimatedEndAt: string | null;
}

export interface EnableMaintenancePayload {
  title?: string;
  message?: string;
  startAt?: string | null;
  estimatedEndAt?: string | null;
  bypassPermissions?: string[];
  bypassRoles?: string[];
  bypassIps?: string[];
  status?: "MAINTENANCE" | "READ_ONLY";
}

export interface UpdateMaintenancePayload {
  enabled?: boolean;
  status?: MaintenanceModeStatus;
  title?: string;
  message?: string;
  startAt?: string | null;
  estimatedEndAt?: string | null;
  bypassPermissions?: string[];
  bypassRoles?: string[];
  bypassIps?: string[];
}
