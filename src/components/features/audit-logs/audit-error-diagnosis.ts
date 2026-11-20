import type { AuditLogItem } from "@/types";

export interface AuditFailureDiagnosis {
  shortLabel: string;
  title: string;
  explanation: string;
  impactNote: string;
  steps: string[];
  rawError?: string | null;
  actionLink?: {
    label: string;
    href: string;
  };
}

function formatLockTime(isoOrDate: unknown, locale: string): string | null {
  if (typeof isoOrDate !== "string" && !(isoOrDate instanceof Date)) return null;
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString(locale === "vi-VN" ? "vi-VN" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function diagnoseAuditFailure(
  log: AuditLogItem,
  locale: string = "vi-VN",
): AuditFailureDiagnosis {
  const isVi = locale === "vi-VN";
  const action = (log.action || "").toUpperCase();
  const targetType = (log.targetType || "").toUpperCase();
  const details = (log.details && typeof log.details === "object" ? log.details : {}) as Record<string, unknown>;
  const rawError =
    log.errorMessage ||
    (typeof details.errorMessage === "string" ? details.errorMessage : null) ||
    (typeof details.error === "string" ? details.error : null);

  const actorLabel =
    log.userName ||
    log.actor?.fullName ||
    log.userEmail ||
    log.actor?.email ||
    (isVi ? "tài khoản này" : "this account");

  // 1. Tài khoản bị khóa tạm thời (sai mật khẩu hoặc 2FA 5 lần liên tiếp)
  if (action === "ACCOUNT_LOCKED") {
    const is2FA = details.trigger === "2FA";
    const attempts = typeof details.failedAttempts === "number" ? details.failedAttempts : 5;
    const lockUntilStr = formatLockTime(details.lockedUntil, locale);

    return {
      shortLabel: isVi
        ? is2FA
          ? "Khóa do sai 2FA"
          : "Khóa tạm 15 phút"
        : is2FA
          ? "Locked (2FA)"
          : "Locked (15m)",
      title: isVi
        ? is2FA
          ? "Tài khoản bị tạm khóa do nhập sai mã 2FA"
          : "Tài khoản bị tạm khóa do nhập sai mật khẩu"
        : is2FA
          ? "Account temporarily locked due to failed 2FA attempts"
          : "Account temporarily locked due to failed password attempts",
      explanation: isVi
        ? `${actorLabel} đã nhập sai ${is2FA ? "mã xác thực 2FA" : "mật khẩu"} ${attempts} lần liên tiếp nên hệ thống tự động khóa trong 15 phút${lockUntilStr ? ` (đến ${lockUntilStr})` : ""}.`
        : `${actorLabel} entered an incorrect ${is2FA ? "2FA code" : "password"} ${attempts} times in a row, triggering an automatic 15-minute lockout${lockUntilStr ? ` (until ${lockUntilStr})` : ""}.`,
      impactNote: isVi
        ? "Đây là cơ chế bảo vệ chống dò mật khẩu tự động — dữ liệu hệ thống vẫn an toàn."
        : "This is an automated brute-force protection mechanism — system data remains safe.",
      steps: isVi
        ? [
            "Kiểm tra địa chỉ IP và xác nhận với nhân sự xem họ có quên mật khẩu hay có người lạ thử đăng nhập.",
            "Chờ hết 15 phút để hệ thống tự mở khóa, hoặc mở hồ sơ người dùng để đặt lại mật khẩu / kiểm tra bảo mật.",
          ]
        : [
            "Verify the source IP and confirm with the user whether they forgot their password or noticed suspicious login attempts.",
            "Wait 15 minutes for automatic unlock, or open the user's profile to reset their password.",
          ],
      rawError,
      actionLink:
        log.targetId && log.targetId !== "SYSTEM"
          ? {
              label: isVi ? "Mở hồ sơ người dùng" : "Open User Profile",
              href: `/users/${log.targetId}`,
            }
          : {
              label: isVi ? "Quản lý người dùng" : "Manage Users",
              href: "/users",
            },
    };
  }

  // 2. Từ chối quyền truy cập (RBAC / 403 / Permission Denied)
  const lowerErr = (rawError || "").toLowerCase();
  if (
    action.includes("DENIED") ||
    lowerErr.includes("403") ||
    lowerErr.includes("forbidden") ||
    lowerErr.includes("permission") ||
    lowerErr.includes("quyền")
  ) {
    return {
      shortLabel: isVi ? "Không đủ quyền (403)" : "Permission Denied (403)",
      title: isVi
        ? "Thao tác bị từ chối do thiếu quyền hạn"
        : "Operation denied due to insufficient permissions",
      explanation: isVi
        ? `${actorLabel} đã thực hiện hành động ${log.action} nhưng vai trò hiện tại không có quyền thực thi.`
        : `${actorLabel} attempted ${log.action} without the required RBAC permission.`,
      impactNote: isVi
        ? "Hệ thống phân quyền đã chặn thao tác trái phép này thành công."
        : "RBAC access control blocked this unauthorized request.",
      steps: isVi
        ? [
            "Xác định xem nhân sự này có thực sự cần thực hiện chức năng trên trong công việc hay không.",
            "Nếu có, vào trang Vai trò & Quyền hạn để bổ sung quyền cho vai trò tương ứng.",
          ]
        : [
            "Confirm whether this user legitimately needs access to this action.",
            "If approved, update the role's permissions under Roles & Permissions.",
          ],
      rawError,
      actionLink: {
        label: isVi ? "Kiểm tra Vai trò & Quyền" : "Review Roles & Permissions",
        href: "/roles",
      },
    };
  }

  // 3. Lỗi Webhook / API Key / Tích hợp ngoài
  if (action.includes("WEBHOOK") || action.includes("API_KEY") || targetType.includes("WEBHOOK") || targetType === "API_KEY") {
    return {
      shortLabel: isVi ? "Lỗi tích hợp / Webhook" : "Integration / Webhook error",
      title: isVi
        ? "Kết nối tích hợp hoặc Webhook gặp lỗi"
        : "Integration or Webhook delivery failed",
      explanation: isVi
        ? rawError
          ? `Hệ thống ghi nhận lỗi khi xử lý tích hợp: ${rawError}`
          : "Yêu cầu gửi dữ liệu sang hệ thống bên thứ ba không thành công hoặc bị từ chối."
        : rawError
          ? `Integration error recorded: ${rawError}`
          : "Outbound webhook delivery or API key verification failed.",
      impactNote: isVi
        ? "Chỉ ảnh hưởng tới đồng bộ dữ liệu ra hệ thống ngoài, dữ liệu nội bộ vẫn bình thường."
        : "Affects external integration sync only; internal operations continue normally.",
      steps: isVi
        ? [
            "Kiểm tra URL endpoint nhận webhook có đang hoạt động và trả về HTTP 2xx hay không.",
            "Vào trang Tích hợp để kiểm tra log gửi lại (Retry) hoặc cấu hình Secret / API Key.",
          ]
        : [
            "Verify the target webhook endpoint URL is reachable and returns HTTP 2xx.",
            "Open Integrations to inspect delivery logs, retry delivery, or verify secrets/API keys.",
          ],
      rawError,
      actionLink: {
        label: isVi ? "Mở trang Tích hợp" : "Open Integrations",
        href: "/integrations",
      },
    };
  }

  // 4. Lỗi Cron Job / Tác vụ định kỳ
  if (action.includes("CRON") || targetType === "CRON_JOB") {
    return {
      shortLabel: isVi ? "Lỗi tác vụ định kỳ" : "Scheduled task failed",
      title: isVi
        ? "Tác vụ tự động (Cron Job) thực thi thất bại"
        : "Scheduled background job failed",
      explanation: isVi
        ? rawError
          ? `Tác vụ định kỳ gặp sự cố: ${rawError}`
          : "Một tác vụ chạy ngầm định kỳ không thể hoàn thành trong lần chạy vừa qua."
        : rawError
          ? `Scheduled job error: ${rawError}`
          : "A scheduled background task failed to complete.",
      impactNote: isVi
        ? "Tác vụ có thể chạy lại ở chu kỳ tiếp theo hoặc kích hoạt chạy lại thủ công."
        : "You can re-trigger this job manually or wait for its next scheduled run.",
      steps: isVi
        ? [
            "Kiểm tra thông báo lỗi kỹ thuật bên dưới để xác định nguyên nhân (kết nối Redis/Storage/DB).",
            "Mở trang Tác vụ định kỳ để kiểm tra trạng thái và chạy thử lại tác vụ.",
          ]
        : [
            "Inspect the error message below to identify connectivity or storage issues.",
            "Open Scheduled Tasks to check job status and trigger a manual run.",
          ],
      rawError,
      actionLink: {
        label: isVi ? "Mở Tác vụ định kỳ" : "Open Scheduled Tasks",
        href: "/scheduled-tasks",
      },
    };
  }

  // 5. Fallback lỗi chung
  return {
    shortLabel: rawError
      ? rawError.slice(0, 32) + (rawError.length > 32 ? "…" : "")
      : isVi
        ? "Thao tác thất bại"
        : "Operation failed",
    title: isVi
      ? `Thao tác ${log.action} không thành công`
      : `Action ${log.action} failed`,
    explanation: isVi
      ? rawError
        ? `Chi tiết lỗi ghi nhận từ hệ thống: ${rawError}`
        : "Hệ thống ghi nhận thao tác này không hoàn thành do dữ liệu không hợp lệ, phiên hết hạn hoặc lỗi xử lý."
      : rawError
        ? `System error recorded: ${rawError}`
        : "The system recorded a failure for this operation (invalid input, expired session, or server error).",
    impactNote: isVi
      ? "Thao tác bị hủy bỏ nên không làm thay đổi dữ liệu hệ thống."
      : "The failed operation was aborted without mutating system state.",
    steps: isVi
      ? [
          "Mở chi tiết bản ghi kiểm toán để xem đầy đủ thông tin thiết bị, IP và dữ liệu đính kèm (Metadata).",
          "Nếu lỗi xảy ra lặp lại với thao tác hợp lệ, kiểm tra nhật ký dịch vụ backend tương ứng.",
        ]
      : [
          "Inspect full audit record metadata, IP, and user-agent details.",
          "If this failure repeats for valid requests, check the corresponding backend service logs.",
        ],
    rawError,
  };
}
