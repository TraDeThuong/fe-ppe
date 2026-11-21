import type { AuditLogItem, CronJobItem, ReportGenerationDto } from "@/types";

export type SidebarBadgeVariant = "danger" | "accent" | "primary";

export interface SidebarBadgeItem {
  count: number;
  /** Nhãn ngắn hiển thị thay cho số (ví dụ "ON" khi đang bật bảo trì) */
  displayText?: string;
  variant: SidebarBadgeVariant;
  /** Mô tả đầy đủ cho tooltip & screen reader */
  label: string;
  /** Hiệu ứng thu hút chú ý cho sự cố/cảnh báo khẩn */
  pulse?: boolean;
}

export type SidebarBadgesMap = Partial<Record<string, SidebarBadgeItem>>;

export interface SidebarBadgesInput {
  permissions: readonly string[];
  pendingIncidentsCount?: number;
  unreadNotificationsCount?: number;
  offlineCamerasCount?: number;
  reportHistory?: readonly Pick<ReportGenerationDto, "status" | "createdAt" | "generatedAt">[];
  reportsLastSeenAt?: number | null;
  failedAuditLogs?: readonly Pick<AuditLogItem, "status" | "createdAt">[];
  auditLastSeenAt?: number | null;
  maintenanceEnabled?: boolean;
  cronJobs?: readonly Pick<CronJobItem, "lastStatus">[];
  nowMs?: number;
  formatLabel: (key: string, count: number) => string;
}

const DEFAULT_REPORTS_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_AUDIT_LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000;

function parseTimestampMs(value?: string | null): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Tính toán bản đồ badge hiển thị cho từng mục trên Sidebar dựa trên quyền hạn
 * và dữ liệu trạng thái mới nhất từ các domain.
 */
export function computeSidebarBadges(input: SidebarBadgesInput): SidebarBadgesMap {
  const {
    permissions,
    pendingIncidentsCount = 0,
    unreadNotificationsCount = 0,
    offlineCamerasCount = 0,
    reportHistory,
    reportsLastSeenAt,
    failedAuditLogs,
    auditLastSeenAt,
    maintenanceEnabled = false,
    cronJobs,
    nowMs = Date.now(),
    formatLabel,
  } = input;

  const can = (permission: string) => permissions.includes(permission);
  const badges: SidebarBadgesMap = {};

  // 1. Sự cố: số sự cố "Chờ thẩm duyệt"
  if (can("PPE_INCIDENT_READ") && pendingIncidentsCount > 0) {
    badges.incidents = {
      count: pendingIncidentsCount,
      variant: "danger",
      label: formatLabel("nav.badge.incidents", pendingIncidentsCount),
      pulse: true,
    };
  }

  // 2. Thông báo: số thông báo chưa đọc (đồng bộ với NotificationBell)
  if (can("NOTIFICATION_READ") && unreadNotificationsCount > 0) {
    badges.notifications = {
      count: unreadNotificationsCount,
      variant: "danger",
      label: formatLabel("nav.badge.notifications", unreadNotificationsCount),
    };
  }

  // 3. Cameras: số camera đang mất kết nối (OFFLINE)
  if (can("PPE_CAMERA_READ") && offlineCamerasCount > 0) {
    badges.cameras = {
      count: offlineCamerasCount,
      variant: "accent",
      label: formatLabel("nav.badge.cameras", offlineCamerasCount),
    };
  }

  // 4. Báo cáo & Thống kê: báo cáo đang chạy + báo cáo mới hoàn tất/lỗi chưa xem
  if (can("PPE_REPORTING_READ") && reportHistory?.length) {
    const reportsCutoff =
      reportsLastSeenAt ?? nowMs - DEFAULT_REPORTS_LOOKBACK_MS;
    let activeOrUnseenCount = 0;
    let hasFailure = false;

    for (const report of reportHistory) {
      if (report.status === "PENDING" || report.status === "PROCESSING") {
        activeOrUnseenCount++;
        continue;
      }

      const relevantTime =
        parseTimestampMs(report.generatedAt) ?? parseTimestampMs(report.createdAt);
      if (relevantTime !== null && relevantTime > reportsCutoff) {
        activeOrUnseenCount++;
        if (report.status === "FAILED") {
          hasFailure = true;
        }
      }
    }

    if (activeOrUnseenCount > 0) {
      badges.reports = {
        count: activeOrUnseenCount,
        variant: hasFailure ? "accent" : "primary",
        label: formatLabel("nav.badge.reports", activeOrUnseenCount),
      };
    }
  }

  // 5. Nhật ký hệ thống: nhật ký mới chưa xem kể từ lần cuối mở trang
  if (can("AUDIT_LOG_READ") && failedAuditLogs?.length) {
    const auditCutoff = auditLastSeenAt ?? nowMs - DEFAULT_AUDIT_LOOKBACK_MS;
    let unseenCount = 0;
    let hasFailure = false;

    for (const log of failedAuditLogs) {
      const createdAtMs = parseTimestampMs(log.createdAt);
      if (createdAtMs !== null && createdAtMs > auditCutoff) {
        unseenCount++;
        if (log.status === "FAILED") {
          hasFailure = true;
        }
      }
    }

    if (unseenCount > 0) {
      badges.auditLogs = {
        count: unseenCount,
        variant: hasFailure ? "accent" : "primary",
        label: formatLabel("nav.badge.auditLogs", unseenCount),
      };
    }
  }

  // 7. Bảo trì hệ thống: đang bật chế độ bảo trì
  if (can("MAINTENANCE_MANAGE") && maintenanceEnabled) {
    badges.maintenance = {
      count: 1,
      displayText: "ON",
      variant: "accent",
      label: formatLabel("nav.badge.maintenance", 1),
    };
  }

  // 8. Tác vụ định kỳ: số cron job lần chạy gần nhất bị FAILED
  if (can("CRON_JOB_READ") && cronJobs?.length) {
    const failedCronCount = cronJobs.filter(
      (job) => String(job.lastStatus ?? "").toUpperCase() === "FAILED",
    ).length;

    if (failedCronCount > 0) {
      badges.scheduledTasks = {
        count: failedCronCount,
        variant: "danger",
        label: formatLabel("nav.badge.scheduledTasks", failedCronCount),
      };
    }
  }

  return badges;
}

/**
 * Định dạng hiển thị số trên badge (giới hạn 99+ ở chế độ thường, 9+ ở chế độ thu gọn).
 */
export function formatBadgeCount(
  badge: SidebarBadgeItem,
  maxCount: number = 99,
): string {
  if (badge.displayText) return badge.displayText;
  if (badge.count > maxCount) return `${maxCount}+`;
  return String(Math.max(0, badge.count));
}

