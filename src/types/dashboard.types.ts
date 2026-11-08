import type { IncidentItem, PaginationMeta } from "@/types";

export type DashboardPreset = "today" | "7d" | "month" | "custom";
export interface DashboardPeriod {
  startDate: string;
  endDate: string;
  fromDate: string;
  toDate: string;
  endExclusive: string;
}
export type DashboardIssue =
  | "limit"
  | "metadata"
  | "changed"
  | "page-error"
  | "invalid-record";
export interface DashboardPage<T> {
  items: T[];
  meta?: PaginationMeta;
}
export interface DashboardCollection<T> {
  items: T[];
  total: number | null;
  complete: boolean;
  issue: DashboardIssue | null;
}
export interface DashboardCount {
  total: number | null;
}
export interface DashboardGroup {
  key: string;
  count: number;
}
export interface DashboardSeverity extends DashboardGroup {
  pending: number;
  confirmed: number;
  resolved: number;
  dismissed: number;
  other: number;
  mttrMinutes: number | null;
  resolutionSamples: number;
}
export interface DashboardCameraStat {
  cameraId: string;
  cameraName?: string;
  total: number;
  pending: number;
}
export interface DashboardAnalytics {
  total: number;
  dismissed: number;
  reviewed: number;
  dismissedRate: number | null;
  distribution: DashboardGroup[];
  hours: number[];
  shifts: { morning: number; afternoon: number; night: number };
  severities: DashboardSeverity[];
  cameras: DashboardCameraStat[];
  mttrMinutes: number | null;
  resolutionSamples: number;
}
export type DashboardIncidentCollection = DashboardCollection<IncidentItem>;
