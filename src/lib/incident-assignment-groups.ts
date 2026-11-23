import { clusterIncidentsByPerson } from "@/lib/incident-cluster-engine";
import {
  resolveIncidentResponsibility,
  type ResponsibilityLookupContext,
} from "@/lib/incident-workflow";
import type { IncidentItem } from "@/types";

export type AssignmentGroupBy =
  | "camera"
  | "person"
  | "violation"
  | "severity"
  | "hour"
  | "shift"
  | "officer"
  | "site";

export interface AssignmentFilterState {
  violationType: string;
  severity: string;
  search: string;
}

export interface IncidentGroupSummary {
  total: number;
  pendingIds: string[];
  confirmedIds: string[];
  resolvedIds: string[];
  dispatchableIds: string[];
  severityCounts: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  violationBreakdown: Array<{ type: string; count: number }>;
  estimatedDistinctPersons: number;
  cameraLabels: string[];
}

export interface IncidentWorkGroup extends IncidentGroupSummary {
  key: string;
  groupBy: AssignmentGroupBy;
  title: string;
  subtitle?: string;
  accentTone: "danger" | "warning" | "primary" | "success" | "neutral";
  items: IncidentItem[];
  personMeta?: {
    trackId: number | null;
    isMultiViolation: boolean;
    cameraLabel: string;
    siteName: string;
    matchMethod: "EXACT_TRACK" | "SPATIAL_IOU" | "SINGLE";
  };
  officerMeta?: {
    officerId: string;
    officerName: string;
    officerEmail?: string;
    activeCount: number;
    resolvedCount: number;
  };
  latestAtMs: number;
}

export interface AssignmentGroupingContext {
  isVietnamese: boolean;
  resolveSiteLabel: (siteId: string, fallbackName?: string) => string;
  resolveCameraLabel: (incident: IncidentItem) => string;
  formatViolation: (violationType: string) => string;
  responsibilityContext?: ResponsibilityLookupContext;
  /** Cửa sổ thời gian gom cùng track_id (giây, mặc định 45s) */
  trackWindowSeconds?: number;
  /** Cửa sổ thời gian gom trùng bbox IoU (giây, mặc định 15s) */
  spatialWindowSeconds?: number;
}

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

/**
 * Tính tóm tắt chi tiết cấu trúc của 1 nhóm sự cố (phân bổ mức độ, loại vi phạm,
 * danh sách camera và số đối tượng ước tính sau khi gom đa vi phạm cùng track_id).
 */
export function summarizeIncidentGroup(
  items: readonly IncidentItem[],
  resolveCameraLabel?: (incident: IncidentItem) => string,
): IncidentGroupSummary {
  const pendingIds: string[] = [];
  const confirmedIds: string[] = [];
  const resolvedIds: string[] = [];
  const dispatchableIds: string[] = [];
  const severityCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  const violationMap = new Map<string, number>();
  const cameraSet = new Set<string>();

  for (const inc of items) {
    if (inc.status === "PENDING_REVIEW") {
      pendingIds.push(inc.id);
      dispatchableIds.push(inc.id);
    } else if (inc.status === "CONFIRMED") {
      confirmedIds.push(inc.id);
      dispatchableIds.push(inc.id);
    } else if (inc.status === "RESOLVED") {
      resolvedIds.push(inc.id);
    }

    const sev = (inc.severity || "MEDIUM").toUpperCase();
    if (sev === "CRITICAL") severityCounts.CRITICAL += 1;
    else if (sev === "HIGH") severityCounts.HIGH += 1;
    else if (sev === "LOW") severityCounts.LOW += 1;
    else severityCounts.MEDIUM += 1;

    const vType = (inc.violationType || "UNKNOWN").toUpperCase();
    violationMap.set(vType, (violationMap.get(vType) ?? 0) + 1);

    const cam = resolveCameraLabel
      ? resolveCameraLabel(inc)
      : inc.cameraCode || inc.cameraName || inc.cameraId?.slice(0, 8);
    if (cam) cameraSet.add(cam);
  }

  const violationBreakdown = Array.from(violationMap.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  const estimatedDistinctPersons =
    items.length <= 1 ? items.length : clusterIncidentsByPerson(items).length;

  return {
    total: items.length,
    pendingIds,
    confirmedIds,
    resolvedIds,
    dispatchableIds,
    severityCounts,
    violationBreakdown,
    estimatedDistinctPersons,
    cameraLabels: Array.from(cameraSet),
  };
}

/**
 * Lọc nhanh danh sách sự cố ngay trên bàn điều phối theo Loại vi phạm, Mức độ và Từ khóa.
 */
export function filterAssignmentIncidents(
  incidents: readonly IncidentItem[],
  filter: Partial<AssignmentFilterState>,
  context: Pick<
    AssignmentGroupingContext,
    "resolveSiteLabel" | "resolveCameraLabel" | "formatViolation" | "responsibilityContext"
  >,
): IncidentItem[] {
  const vFilter = filter.violationType?.trim().toUpperCase();
  const sFilter = filter.severity?.trim().toUpperCase();
  const q = filter.search?.trim().toLocaleLowerCase();

  if (!vFilter && !sFilter && !q) return [...incidents];

  return incidents.filter((inc) => {
    if (vFilter && (inc.violationType || "").toUpperCase() !== vFilter) {
      return false;
    }
    if (sFilter && (inc.severity || "").toUpperCase() !== sFilter) {
      return false;
    }
    if (q) {
      const site = context.resolveSiteLabel(inc.siteId, inc.siteName);
      const cam = context.resolveCameraLabel(inc);
      const vLabel = context.formatViolation(inc.violationType);
      const resp = resolveIncidentResponsibility(inc, context.responsibilityContext);
      const haystack = [
        inc.id,
        inc.id.slice(0, 8),
        site,
        cam,
        inc.violationType,
        vLabel,
        inc.description || "",
        resp.assignedOfficerName || "",
        ...resp.ownerNames,
      ]
        .join(" ")
        .toLocaleLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

function getLocalDayLabel(date: Date, isVietnamese: boolean): string {
  const now = new Date();
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const targetStr = fmt(date);
  if (targetStr === fmt(now)) return isVietnamese ? "Hôm nay" : "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (targetStr === fmt(yesterday)) return isVietnamese ? "Hôm qua" : "Yesterday";
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function resolveShiftBucket(
  timestampMs: number,
  isVietnamese: boolean,
): { key: string; title: string; subtitle: string; sortTs: number } {
  const date = new Date(timestampMs);
  if (!Number.isFinite(date.getTime())) {
    return {
      key: "shift:unknown",
      title: isVietnamese ? "Không rõ ca trực" : "Unknown shift",
      subtitle: "",
      sortTs: 0,
    };
  }
  const hour = date.getHours();
  // Ca Đêm từ 22:00 hôm trước tới 05:59 hôm sau -> quy về ngày bắt đầu ca để gom liền mạch
  const shiftDate = new Date(date);
  let shiftCode: "MORNING" | "AFTERNOON" | "NIGHT";
  let title: string;
  let shiftStartHour: number;

  if (hour >= 6 && hour < 14) {
    shiftCode = "MORNING";
    title = isVietnamese ? "Ca Sáng (06:00 – 14:00)" : "Morning Shift (06:00 – 14:00)";
    shiftStartHour = 6;
  } else if (hour >= 14 && hour < 22) {
    shiftCode = "AFTERNOON";
    title = isVietnamese ? "Ca Chiều (14:00 – 22:00)" : "Afternoon Shift (14:00 – 22:00)";
    shiftStartHour = 14;
  } else {
    shiftCode = "NIGHT";
    title = isVietnamese ? "Ca Đêm (22:00 – 06:00)" : "Night Shift (22:00 – 06:00)";
    shiftStartHour = 22;
    if (hour < 6) {
      shiftDate.setDate(shiftDate.getDate() - 1);
    }
  }

  const y = shiftDate.getFullYear();
  const m = String(shiftDate.getMonth() + 1).padStart(2, "0");
  const d = String(shiftDate.getDate()).padStart(2, "0");
  const sortTs = new Date(y, shiftDate.getMonth(), shiftDate.getDate(), shiftStartHour, 0, 0).getTime();

  return {
    key: `shift:${y}-${m}-${d}:${shiftCode}`,
    title,
    subtitle: getLocalDayLabel(shiftDate, isVietnamese),
    sortTs,
  };
}

function resolveHourBucket(
  timestampMs: number,
  isVietnamese: boolean,
): { key: string; title: string; subtitle: string; sortTs: number } {
  const date = new Date(timestampMs);
  if (!Number.isFinite(date.getTime())) {
    return {
      key: "hour:unknown",
      title: isVietnamese ? "Không rõ khung giờ" : "Unknown hour",
      subtitle: "",
      sortTs: 0,
    };
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hour = date.getHours();
  const hh = String(hour).padStart(2, "0");
  const nextHh = String((hour + 1) % 24).padStart(2, "0");
  const sortTs = new Date(y, date.getMonth(), date.getDate(), hour, 0, 0).getTime();

  return {
    key: `hour:${y}-${m}-${d}T${hh}`,
    title: `${hh}:00 – ${nextHh}:00`,
    subtitle: getLocalDayLabel(date, isVietnamese),
    sortTs,
  };
}

function computeToneFromSummary(
  summary: IncidentGroupSummary,
): IncidentWorkGroup["accentTone"] {
  if (summary.severityCounts.CRITICAL > 0) return "danger";
  if (summary.severityCounts.HIGH > 0) return "warning";
  if (summary.pendingIds.length > 0 || summary.confirmedIds.length > 0) return "primary";
  if (summary.resolvedIds.length > 0) return "success";
  return "neutral";
}

function latestTimestamp(items: readonly IncidentItem[]): number {
  let max = 0;
  for (const inc of items) {
    const ts = Date.parse(inc.detectedAt || inc.createdAt);
    if (Number.isFinite(ts) && ts > max) max = ts;
  }
  return max;
}

/**
 * Gom nhóm danh sách IncidentItem theo 8 chiều quản trị công việc cho `/incidents/assignments`.
 */
export function groupIncidentsForAssignment(
  incidents: readonly IncidentItem[],
  groupBy: AssignmentGroupBy,
  context: AssignmentGroupingContext,
): IncidentWorkGroup[] {
  if (incidents.length === 0) return [];
  const { isVietnamese, resolveCameraLabel, resolveSiteLabel, formatViolation } =
    context;

  // Chế độ đặc biệt: gom theo Đối tượng & Đa vi phạm (track_id + BBox IoU)
  if (groupBy === "person") {
    const clusters = clusterIncidentsByPerson(incidents, {
      trackWindowSeconds: context.trackWindowSeconds ?? 45,
      spatialWindowSeconds: context.spatialWindowSeconds ?? 15,
    });

    const groups: IncidentWorkGroup[] = clusters.map((cl) => {
      const primary = cl.primary;
      const summary = summarizeIncidentGroup(cl.items, resolveCameraLabel);
      const camLabel = resolveCameraLabel(primary);
      const siteName = resolveSiteLabel(primary.siteId, primary.siteName);
      const personTag =
        cl.personTrackId !== null
          ? isVietnamese
            ? `Người #${cl.personTrackId}`
            : `Person #${cl.personTrackId}`
          : isVietnamese
            ? `Đối tượng (${primary.id.slice(0, 6)})`
            : `Subject (${primary.id.slice(0, 6)})`;

      const title = cl.isMultiViolation
        ? isVietnamese
          ? `Đa vi phạm PPE • ${personTag}`
          : `Multi-PPE Violation • ${personTag}`
        : cl.items.length > 1
          ? isVietnamese
            ? `${personTag} (${cl.items.length} lần ghi nhận)`
            : `${personTag} (${cl.items.length} detections)`
          : `${personTag} • ${formatViolation(primary.violationType)}`;

      const matchHint =
        cl.matchMethod === "EXACT_TRACK"
          ? isVietnamese
            ? "Khớp cùng Track ID"
            : "Exact Track ID"
          : cl.matchMethod === "SPATIAL_IOU"
            ? isVietnamese
              ? "Khớp vị trí Bounding Box"
              : "Bounding Box IoU Match"
            : undefined;

      return {
        key: `person:${primary.id}`,
        groupBy: "person",
        title,
        subtitle: [siteName, camLabel, matchHint].filter(Boolean).join(" • "),
        accentTone: cl.isMultiViolation ? "danger" : computeToneFromSummary(summary),
        items: cl.items,
        ...summary,
        estimatedDistinctPersons: 1,
        personMeta: {
          trackId: cl.personTrackId,
          isMultiViolation: cl.isMultiViolation,
          cameraLabel: camLabel,
          siteName,
          matchMethod: cl.matchMethod,
        },
        latestAtMs: latestTimestamp(cl.items),
      };
    });

    // Ưu tiên cụm Đa vi phạm / nhiều bản ghi lên đầu, sau đó mới nhất
    return groups.sort(
      (a, b) =>
        Number(Boolean(b.personMeta?.isMultiViolation)) -
          Number(Boolean(a.personMeta?.isMultiViolation)) ||
        b.items.length - a.items.length ||
        b.latestAtMs - a.latestAtMs,
    );
  }

  // Các chế độ bucket khóa chuẩn: camera, violation, severity, hour, shift, officer, site
  interface RawBucket {
    key: string;
    title: string;
    subtitle?: string;
    items: IncidentItem[];
    sortOrder?: number;
    sortTs?: number;
    officerMeta?: IncidentWorkGroup["officerMeta"];
    forcedTone?: IncidentWorkGroup["accentTone"];
  }

  const map = new Map<string, RawBucket>();

  for (const inc of incidents) {
    let key: string;
    let title: string;
    let subtitle: string | undefined;
    let sortOrder: number | undefined;
    let sortTs: number | undefined;
    let officerMeta: IncidentWorkGroup["officerMeta"] | undefined;
    let forcedTone: IncidentWorkGroup["accentTone"] | undefined;

    if (groupBy === "camera") {
      key = `cam:${inc.cameraId || inc.cameraCode || "UNKNOWN"}`;
      title = resolveCameraLabel(inc);
      subtitle = resolveSiteLabel(inc.siteId, inc.siteName);
    } else if (groupBy === "site") {
      key = `site:${inc.siteId || "UNKNOWN"}`;
      title = resolveSiteLabel(inc.siteId, inc.siteName);
    } else if (groupBy === "violation") {
      const code = (inc.violationType || "UNKNOWN").toUpperCase();
      key = `vio:${code}`;
      title = formatViolation(code);
      subtitle = code;
      if (code === "MULTI_VIOLATION" || code === "RESTRICTED_AREA") {
        forcedTone = "danger";
      } else if (code === "NO_HELMET") {
        forcedTone = "warning";
      }
    } else if (groupBy === "severity") {
      const sev = (inc.severity || "MEDIUM").toUpperCase();
      key = `sev:${sev}`;
      sortOrder = SEVERITY_ORDER[sev] ?? 99;
      if (sev === "CRITICAL") {
        title = isVietnamese ? "Khẩn cấp (CRITICAL)" : "Critical Priority";
        forcedTone = "danger";
      } else if (sev === "HIGH") {
        title = isVietnamese ? "Mức độ Cao (HIGH)" : "High Priority";
        forcedTone = "warning";
      } else if (sev === "MEDIUM") {
        title = isVietnamese ? "Mức độ Trung bình (MEDIUM)" : "Medium Priority";
        forcedTone = "primary";
      } else {
        title = isVietnamese ? "Mức độ Thấp (LOW)" : "Low Priority";
        forcedTone = "neutral";
      }
    } else if (groupBy === "hour") {
      const ts = Date.parse(inc.detectedAt || inc.createdAt);
      const b = resolveHourBucket(ts, isVietnamese);
      key = b.key;
      title = b.title;
      subtitle = b.subtitle;
      sortTs = b.sortTs;
    } else if (groupBy === "shift") {
      const ts = Date.parse(inc.detectedAt || inc.createdAt);
      const b = resolveShiftBucket(ts, isVietnamese);
      key = b.key;
      title = b.title;
      subtitle = b.subtitle;
      sortTs = b.sortTs;
    } else {
      // officer
      const resp = resolveIncidentResponsibility(inc, context.responsibilityContext);
      if (resp.assignedOfficerId) {
        const profile = context.responsibilityContext?.usersById?.get(resp.assignedOfficerId);
        const name =
          resp.assignedOfficerName ||
          profile?.name ||
          `Officer #${resp.assignedOfficerId.slice(0, 8)}`;
        key = `off:${resp.assignedOfficerId}`;
        title = name;
        subtitle = profile?.email;
        sortOrder = 1;
        officerMeta = {
          officerId: resp.assignedOfficerId,
          officerName: name,
          officerEmail: profile?.email,
          activeCount: 0,
          resolvedCount: 0,
        };
      } else {
        key = "off:__unassigned__";
        title = isVietnamese ? "Chưa phân công Officer" : "Unassigned to Officer";
        subtitle = isVietnamese
          ? "Cần Safety Manager chỉ định cán bộ xử lý"
          : "Requires Safety Manager dispatch";
        sortOrder = 0;
        forcedTone = "warning";
      }
    }

    let bucket = map.get(key);
    if (!bucket) {
      bucket = {
        key,
        title,
        subtitle,
        items: [],
        sortOrder,
        sortTs,
        officerMeta,
        forcedTone,
      };
      map.set(key, bucket);
    }
    bucket.items.push(inc);
    if (bucket.officerMeta) {
      if (inc.status === "CONFIRMED") bucket.officerMeta.activeCount += 1;
      if (inc.status === "RESOLVED" || inc.status === "CLOSED") {
        bucket.officerMeta.resolvedCount += 1;
      }
    }
  }

  const groups: IncidentWorkGroup[] = Array.from(map.values()).map((bucket) => {
    const summary = summarizeIncidentGroup(bucket.items, resolveCameraLabel);
    const subtitle =
      bucket.subtitle ||
      (groupBy === "severity" || groupBy === "site"
        ? summary.cameraLabels.slice(0, 3).join(", ") +
          (summary.cameraLabels.length > 3
            ? ` (+${summary.cameraLabels.length - 3})`
            : "")
        : undefined);

    return {
      key: bucket.key,
      groupBy,
      title: bucket.title,
      subtitle,
      accentTone: bucket.forcedTone ?? computeToneFromSummary(summary),
      items: bucket.items,
      ...summary,
      officerMeta: bucket.officerMeta,
      latestAtMs: latestTimestamp(bucket.items),
    };
  });

  if (groupBy === "severity") {
    return groups.sort(
      (a, b) =>
        (map.get(a.key)?.sortOrder ?? 99) - (map.get(b.key)?.sortOrder ?? 99),
    );
  }
  if (groupBy === "hour" || groupBy === "shift") {
    return groups.sort(
      (a, b) =>
        (map.get(b.key)?.sortTs ?? b.latestAtMs) -
        (map.get(a.key)?.sortTs ?? a.latestAtMs),
    );
  }
  if (groupBy === "officer") {
    return groups.sort(
      (a, b) =>
        (map.get(a.key)?.sortOrder ?? 1) - (map.get(b.key)?.sortOrder ?? 1) ||
        b.items.length - a.items.length,
    );
  }

  return groups.sort(
    (a, b) =>
      b.severityCounts.CRITICAL - a.severityCounts.CRITICAL ||
      b.items.length - a.items.length ||
      b.latestAtMs - a.latestAtMs,
  );
}
