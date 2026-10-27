import type { PaginationMeta } from "./rbac.types";

/**
 * Contract Trung tâm Thông báo & Cảnh báo an toàn (Notification Service).
 * Nguồn đối chiếu Backend:
 * - Prisma Schema: smart-ppe-notification-service/prisma/schema.prisma
 * - DTOs & Validation: smart-ppe-notification-service/src/modules/notification/notification.dto.ts & notification.validation.ts
 * - Routes: smart-ppe-notification-service/src/modules/notification/notification.route.ts
 * - Constants: smart-ppe-notification-service/src/common/constants/notification.constant.ts
 */

// ============================================================================
// 1. HẰNG SỐ & ENUMS (CONSTANTS & TYPES)
// ============================================================================

export const NOTIFICATION_SEVERITY = {
  LOW: "LOW",
  NORMAL: "NORMAL",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const;

export type NotificationSeverity =
  (typeof NOTIFICATION_SEVERITY)[keyof typeof NOTIFICATION_SEVERITY];

export const NOTIFICATION_CHANNEL = {
  IN_APP: "IN_APP",
  WEB: "WEB",
  EMAIL: "EMAIL",
  ZALO_ZNS: "ZALO_ZNS",
  WEBHOOK: "WEBHOOK",
} as const;

export type NotificationChannel =
  (typeof NOTIFICATION_CHANNEL)[keyof typeof NOTIFICATION_CHANNEL];

export const NOTIFICATION_STATUS = {
  PENDING: "PENDING",
  SENT: "SENT",
  FAILED: "FAILED",
  READ: "READ",
} as const;

export type NotificationStatus =
  (typeof NOTIFICATION_STATUS)[keyof typeof NOTIFICATION_STATUS];

export const NOTIFICATION_TYPE = {
  SYSTEM: "SYSTEM",
  ALERT: "ALERT",
  INFO: "INFO",
  SUCCESS: "SUCCESS",
  WARNING: "WARNING",
  PPE_VIOLATION: "PPE_VIOLATION",
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

export const NOTIFICATION_TEMPLATE_CODE = {
  PPE_VIOLATION_ALERT: "PPE_VIOLATION_ALERT",
  INCIDENT_ASSIGNED: "INCIDENT_ASSIGNED",
  INCIDENT_RESOLVED: "INCIDENT_RESOLVED",
  VERIFY_EMAIL: "VERIFY_EMAIL",
  RESET_PASSWORD: "RESET_PASSWORD",
  NEW_DEVICE_ALERT: "NEW_DEVICE_ALERT",
  WELCOME: "WELCOME",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  ROLE_ASSIGNED: "ROLE_ASSIGNED",
  ACTIVITY_SUMMARY_DIGEST: "ACTIVITY_SUMMARY_DIGEST",
  CUSTOM: "CUSTOM",
} as const;

export type NotificationTemplateCode =
  (typeof NOTIFICATION_TEMPLATE_CODE)[keyof typeof NOTIFICATION_TEMPLATE_CODE];

// ============================================================================
// 2. DTOs HỘP THƯ THÔNG BÁO (NOTIFICATION INBOX)
// ============================================================================

export interface NotificationItemDto {
  id: string;
  userId: string;
  incidentId: string | null;
  templateId: string | null;
  channel: NotificationChannel;
  title: string;
  content: string;
  severity: NotificationSeverity;
  status: NotificationStatus;
  sentAt: string | Date | null;
  readAt: string | Date | null;
  createdAt: string | Date;
  isRead?: boolean;
  type?: string;
  actionUrl?: string | null;
  evidenceUrl?: string | null;
  metadata?: {
    cameraCode?: string;
    cameraId?: string;
    siteName?: string;
    siteId?: string;
    zoneName?: string;
    violationType?: string;
    [key: string]: unknown;
  };
}

export interface ListNotificationsQuery {
  page?: number;
  limit?: number;
  isRead?: boolean;
  status?: string;
  severity?: NotificationSeverity;
  channel?: NotificationChannel;
  incidentId?: string;
  type?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
}

export interface NotificationListResponse {
  data: NotificationItemDto[];
  meta: PaginationMeta;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

// ============================================================================
// 3. DTOs CẤU HÌNH KÊNH & CHỐNG ALERT FATIGUE (PREFERENCES)
// ============================================================================

export interface NotificationPreferenceDto {
  id: string;
  userId: string;
  channel: NotificationChannel;
  enabled: boolean;
  severityThreshold: NotificationSeverity;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface UpdateNotificationPreferencePayload {
  channel: NotificationChannel;
  enabled: boolean;
  severityThreshold?: NotificationSeverity;
}

// ============================================================================
// 4. DTOs MẪU THÔNG BÁO (NOTIFICATION TEMPLATES)
// ============================================================================

export interface NotificationTemplateItemDto {
  id: string;
  code: string;
  name: string;
  channel: NotificationChannel;
  subjectTemplate: string | null;
  contentTemplate: string;
  status: "ACTIVE" | "INACTIVE";
  description?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface TemplateQueryParams {
  page?: number;
  limit?: number;
  channel?: string;
  status?: string;
  search?: string;
}

export interface TemplateListResponse {
  data: NotificationTemplateItemDto[];
  meta: PaginationMeta;
}

export interface CreateNotificationTemplatePayload {
  code: string;
  name: string;
  channel: NotificationChannel;
  subjectTemplate?: string | null;
  contentTemplate: string;
  status?: "ACTIVE" | "INACTIVE";
  description?: string;
}

export interface UpdateNotificationTemplatePayload {
  name?: string;
  channel?: NotificationChannel;
  subjectTemplate?: string | null;
  contentTemplate?: string;
  status?: "ACTIVE" | "INACTIVE";
  description?: string;
}

export interface PreviewTemplatePayload {
  variables: Record<string, unknown>;
}

export interface PreviewTemplateResponse {
  code: string;
  subject: string | null;
  title: string | null;
  content: string;
  html?: string;
}

export interface TestSendTemplatePayload {
  toEmail?: string;
  variables: Record<string, unknown>;
  channels?: NotificationChannel[];
}

// ============================================================================
// 5. DTOs NHẬT KÝ HÀNG ĐỢI EMAIL (EMAIL QUEUE & LOGS)
// ============================================================================

export interface EmailLogItemDto {
  id: string;
  userId: string | null;
  toEmail: string;
  subject: string;
  templateKey: string;
  templateData: unknown;
  status: "PENDING" | "PROCESSING" | "SENT" | "FAILED";
  attempts: number;
  lastError: string | null;
  sentAt: string | Date | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface EmailLogsQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  toEmail?: string;
}

export interface EmailLogsListResponse {
  data: EmailLogItemDto[];
  meta: PaginationMeta;
}

// ============================================================================
// 6. DTOs PHÁT THÔNG BÁO HỆ THỐNG & CHỈ ĐỊNH (BROADCAST & SEND)
// ============================================================================

export interface BroadcastNotificationPayload {
  title: string;
  content: string;
  severity?: NotificationSeverity;
  type?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface SendNotificationPayload {
  userIds: string[];
  channels: NotificationChannel[];
  title: string;
  content: string;
  severity?: NotificationSeverity;
  type?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  templateKey?: string;
  templateData?: Record<string, unknown>;
}
