export type AuditActionCategory = "config" | "auth" | "rbac" | "system" | "integration" | "other";

export interface AuditActionMeta {
  code: string;
  labelVi: string;
  labelEn: string;
  descriptionVi: string;
  descriptionEn: string;
  category: AuditActionCategory;
}

export interface AuditActionInfo {
  code: string;
  label: string;
  description: string;
  category: AuditActionCategory;
}

export const AUDIT_ACTION_DICTIONARY: AuditActionMeta[] = [
  // ── Cấu hình Hệ thống (Config) ──
  {
    code: "TOGGLE_FEATURE_FLAG",
    labelVi: "Bật/tắt tính năng hệ thống",
    labelEn: "Toggle Feature Flag",
    descriptionVi: "Quản trị viên bật hoặc tắt nhanh một tính năng hệ thống (Feature Flag) mà không cần khởi động lại máy chủ.",
    descriptionEn: "Administrator enabled or disabled a system feature flag without restarting services.",
    category: "config",
  },
  {
    code: "UPDATE_SYSTEM_CONFIG",
    labelVi: "Cập nhật cấu hình hệ thống",
    labelEn: "Update System Config",
    descriptionVi: "Thay đổi giá trị của một tham số vận hành hoặc cấu hình chung của hệ thống.",
    descriptionEn: "Modified the value of a system-wide operational parameter.",
    category: "config",
  },
  {
    code: "CREATE_SYSTEM_CONFIG",
    labelVi: "Tạo cấu hình hệ thống",
    labelEn: "Create System Config",
    descriptionVi: "Thêm mới một biến cấu hình vào kho tham số hệ thống.",
    descriptionEn: "Created a new configuration parameter in system settings.",
    category: "config",
  },
  {
    code: "DELETE_SYSTEM_CONFIG",
    labelVi: "Xóa cấu hình hệ thống",
    labelEn: "Delete System Config",
    descriptionVi: "Xóa bỏ một biến cấu hình khỏi hệ thống.",
    descriptionEn: "Removed an existing configuration parameter.",
    category: "config",
  },

  // ── Đăng nhập & Bảo mật (Auth & Security) ──
  {
    code: "LOGIN_GOOGLE",
    labelVi: "Đăng nhập bằng Google",
    labelEn: "Google Sign-In",
    descriptionVi: "Người dùng đăng nhập vào hệ thống bằng tài khoản Google đã liên kết.",
    descriptionEn: "User signed in using a linked Google account.",
    category: "auth",
  },
  {
    code: "VERIFY_2FA_LOGIN",
    labelVi: "Xác thực đăng nhập 2FA",
    labelEn: "2FA Login Verification",
    descriptionVi: "Người dùng nhập mã xác thực 2 bước (6 chữ số từ ứng dụng Authenticator) để hoàn tất đăng nhập.",
    descriptionEn: "User verified their two-factor authentication code during sign-in.",
    category: "auth",
  },
  {
    code: "ENABLE_2FA",
    labelVi: "Bật bảo mật 2FA",
    labelEn: "Enable 2FA",
    descriptionVi: "Người dùng kích hoạt xác thực 2 bước cho tài khoản để tăng cường bảo mật.",
    descriptionEn: "User enabled two-factor authentication on their account.",
    category: "auth",
  },
  {
    code: "DISABLE_2FA",
    labelVi: "Tắt bảo mật 2FA",
    labelEn: "Disable 2FA",
    descriptionVi: "Người dùng tắt tính năng xác thực 2 bước khỏi tài khoản.",
    descriptionEn: "User disabled two-factor authentication on their account.",
    category: "auth",
  },
  {
    code: "REGENERATE_2FA_BACKUP_CODES",
    labelVi: "Tạo lại mã dự phòng 2FA",
    labelEn: "Regenerate 2FA Backup Codes",
    descriptionVi: "Người dùng tạo bộ mã khôi phục 2FA mới (các mã dự phòng cũ hết hiệu lực).",
    descriptionEn: "User generated a new set of 2FA recovery backup codes.",
    category: "auth",
  },
  {
    code: "ACCOUNT_LOCKED",
    labelVi: "Khóa tài khoản tạm thời",
    labelEn: "Account Locked",
    descriptionVi: "Hệ thống tự động khóa tài khoản 15 phút vì nhập sai mật khẩu hoặc mã 2FA quá 5 lần liên tiếp.",
    descriptionEn: "System automatically locked the account for 15 minutes after 5 consecutive failed attempts.",
    category: "auth",
  },
  {
    code: "REVOKE_USER_SESSION",
    labelVi: "Đăng xuất một phiên thiết bị",
    labelEn: "Revoke User Session",
    descriptionVi: "Thu hồi phiên đăng nhập từ xa trên một thiết bị cụ thể.",
    descriptionEn: "Terminated an active session on a specific device.",
    category: "auth",
  },
  {
    code: "REVOKE_ALL_USER_SESSIONS",
    labelVi: "Đăng xuất tất cả thiết bị",
    labelEn: "Revoke All Sessions",
    descriptionVi: "Đăng xuất tài khoản khỏi mọi thiết bị đang đăng nhập.",
    descriptionEn: "Signed the account out from all active devices.",
    category: "auth",
  },
  {
    code: "LINK_SOCIAL_ACCOUNT",
    labelVi: "Liên kết tài khoản Google",
    labelEn: "Link Social Account",
    descriptionVi: "Liên kết tài khoản hệ thống với tài khoản Google để đăng nhập nhanh.",
    descriptionEn: "Linked a Google account to the user profile.",
    category: "auth",
  },
  {
    code: "UNLINK_SOCIAL_ACCOUNT",
    labelVi: "Hủy liên kết tài khoản Google",
    labelEn: "Unlink Social Account",
    descriptionVi: "Gỡ liên kết đăng nhập Google khỏi tài khoản.",
    descriptionEn: "Unlinked a Google account from the user profile.",
    category: "auth",
  },
  {
    code: "REQUEST_ACCOUNT_DEACTIVATION",
    labelVi: "Yêu cầu vô hiệu hóa tài khoản",
    labelEn: "Request Account Deactivation",
    descriptionVi: "Người dùng gửi yêu cầu tự đóng/vô hiệu hóa tài khoản cá nhân.",
    descriptionEn: "User requested account deactivation.",
    category: "auth",
  },
  {
    code: "CONFIRM_ACCOUNT_DEACTIVATION",
    labelVi: "Xác nhận vô hiệu hóa tài khoản",
    labelEn: "Confirm Account Deactivation",
    descriptionVi: "Hoàn tất xác nhận vô hiệu hóa tài khoản theo yêu cầu.",
    descriptionEn: "Confirmed and completed account deactivation.",
    category: "auth",
  },

  // ── Phân quyền & Người dùng (RBAC & Users) ──
  {
    code: "ASSIGN_USER_ROLE",
    labelVi: "Gán vai trò người dùng",
    labelEn: "Assign User Role",
    descriptionVi: "Quản trị viên cấp mới hoặc thay đổi vai trò quyền hạn (như Quản lý an toàn, Cán bộ an toàn…) cho một tài khoản.",
    descriptionEn: "Administrator assigned or changed the RBAC role of a user account.",
    category: "rbac",
  },
  {
    code: "CREATE_ROLE",
    labelVi: "Tạo vai trò mới",
    labelEn: "Create Role",
    descriptionVi: "Tạo một nhóm vai trò phân quyền mới trong hệ thống.",
    descriptionEn: "Created a new RBAC role.",
    category: "rbac",
  },
  {
    code: "UPDATE_ROLE",
    labelVi: "Cập nhật vai trò",
    labelEn: "Update Role",
    descriptionVi: "Chỉnh sửa tên hoặc mô tả của một vai trò.",
    descriptionEn: "Updated the name or description of an existing role.",
    category: "rbac",
  },
  {
    code: "DELETE_ROLE",
    labelVi: "Xóa vai trò",
    labelEn: "Delete Role",
    descriptionVi: "Xóa một vai trò tùy chỉnh không còn sử dụng.",
    descriptionEn: "Deleted a custom RBAC role.",
    category: "rbac",
  },
  {
    code: "SYNC_ROLE_PERMISSIONS",
    labelVi: "Đồng bộ quyền của vai trò",
    labelEn: "Sync Role Permissions",
    descriptionVi: "Cập nhật lại toàn bộ danh sách quyền hạn được phép thao tác của một vai trò.",
    descriptionEn: "Synchronized the full permission set granted to a role.",
    category: "rbac",
  },
  {
    code: "REMOVE_ROLE_PERMISSION",
    labelVi: "Gỡ quyền khỏi vai trò",
    labelEn: "Remove Role Permission",
    descriptionVi: "Thu hồi một quyền hạn cụ thể ra khỏi vai trò.",
    descriptionEn: "Removed a specific permission from a role.",
    category: "rbac",
  },
  {
    code: "DELETE_USER",
    labelVi: "Vô hiệu hóa người dùng",
    labelEn: "Deactivate User",
    descriptionVi: "Quản trị viên vô hiệu hóa hoặc xóa mềm một tài khoản nhân sự.",
    descriptionEn: "Administrator deactivated or soft-deleted a user account.",
    category: "rbac",
  },
  {
    code: "RESTORE_USER",
    labelVi: "Khôi phục người dùng",
    labelEn: "Restore User",
    descriptionVi: "Mở lại một tài khoản nhân sự đã từng bị vô hiệu hóa.",
    descriptionEn: "Restored a previously deactivated user account.",
    category: "rbac",
  },
  {
    code: "ADMIN_RESET_PASSWORD",
    labelVi: "Quản trị viên đặt lại mật khẩu",
    labelEn: "Admin Password Reset",
    descriptionVi: "Quản trị viên cấp lại mật khẩu mới cho tài khoản nhân sự (ví dụ khi quên mật khẩu hoặc bị khóa).",
    descriptionEn: "Administrator reset the password for a user account.",
    category: "rbac",
  },
  {
    code: "DELETE_USER_DEVICE",
    labelVi: "Xóa thiết bị tin cậy",
    labelEn: "Delete User Device",
    descriptionVi: "Gỡ bỏ một thiết bị đã đăng ký khỏi tài khoản người dùng.",
    descriptionEn: "Removed a registered device from a user account.",
    category: "rbac",
  },

  // ── Hệ thống & Tác vụ định kỳ (System & Cron) ──
  {
    code: "TRIGGER_CRON_JOB",
    labelVi: "Chạy tác vụ định kỳ",
    labelEn: "Trigger Scheduled Job",
    descriptionVi: "Quản trị viên kích hoạt chạy ngay một tác vụ tự động (dọn log cũ, dọn token hết hạn hoặc gửi báo cáo tổng hợp).",
    descriptionEn: "Administrator manually triggered a scheduled background job (cleanup or summary digest).",
    category: "system",
  },
  {
    code: "TOGGLE_CRON_JOB",
    labelVi: "Bật/tắt lịch chạy tự động",
    labelEn: "Toggle Scheduled Job",
    descriptionVi: "Bật hoặc tạm dừng lịch chạy tự động của một tác vụ định kỳ.",
    descriptionEn: "Enabled or paused the automatic schedule of a cron job.",
    category: "system",
  },
  {
    code: "CLEANUP_AUDIT_LOGS",
    labelVi: "Dọn nhật ký kiểm toán cũ",
    labelEn: "Cleanup Old Audit Logs",
    descriptionVi: "Hệ thống tự động dọn bớt các bản ghi kiểm toán đã quá thời hạn lưu trữ.",
    descriptionEn: "System purged audit log entries past the configured retention period.",
    category: "system",
  },
  {
    code: "CLEANUP_UNCONFIRMED_UPLOADS",
    labelVi: "Dọn tệp tải lên chưa xác nhận",
    labelEn: "Cleanup Unconfirmed Uploads",
    descriptionVi: "Tác vụ tự động xóa các tệp tạm tải lên nhưng không hoàn tất liên kết.",
    descriptionEn: "Background job removed orphaned temporary uploads.",
    category: "system",
  },
  {
    code: "CLEANUP_EXPIRED_TOKENS",
    labelVi: "Dọn phiên & mã hết hạn",
    labelEn: "Cleanup Expired Tokens",
    descriptionVi: "Tác vụ tự động xóa các token đăng nhập/xác thực đã hết hạn để tối ưu database.",
    descriptionEn: "Background job purged expired authentication and verification tokens.",
    category: "system",
  },
  {
    code: "SEND_SUMMARY_DIGEST",
    labelVi: "Gửi email báo cáo tổng hợp",
    labelEn: "Send Summary Digest",
    descriptionVi: "Hệ thống tự động tổng hợp số liệu hoạt động và gửi email cho Quản trị viên.",
    descriptionEn: "System compiled and emailed periodic activity summary digests to admins.",
    category: "system",
  },
  {
    code: "ENABLE_MAINTENANCE",
    labelVi: "Bật chế độ bảo trì",
    labelEn: "Enable Maintenance Mode",
    descriptionVi: "Chuyển hệ thống sang chế độ bảo trì để nâng cấp hoặc kiểm tra kỹ thuật.",
    descriptionEn: "Switched the system into maintenance mode.",
    category: "system",
  },
  {
    code: "UPDATE_MAINTENANCE",
    labelVi: "Cập nhật thông báo bảo trì",
    labelEn: "Update Maintenance Config",
    descriptionVi: "Chỉnh sửa thông báo, thời gian dự kiến hoặc danh sách IP/vai trò được phép truy cập khi bảo trì.",
    descriptionEn: "Updated maintenance message, schedule, or bypass rules.",
    category: "system",
  },
  {
    code: "DISABLE_MAINTENANCE",
    labelVi: "Tắt chế độ bảo trì",
    labelEn: "Disable Maintenance Mode",
    descriptionVi: "Đưa hệ thống trở lại trạng thái hoạt động bình thường sau khi bảo trì xong.",
    descriptionEn: "Restored the system back to normal online operation.",
    category: "system",
  },

  // ── Tích hợp & Thông báo (Integration) ──
  {
    code: "CREATE_API_KEY",
    labelVi: "Tạo khóa API (API Key)",
    labelEn: "Create API Key",
    descriptionVi: "Cấp mới một API Key cho ứng dụng hoặc đối tác bên ngoài kết nối vào hệ thống.",
    descriptionEn: "Generated a new API key for external system integration.",
    category: "integration",
  },
  {
    code: "REVOKE_API_KEY",
    labelVi: "Thu hồi khóa API",
    labelEn: "Revoke API Key",
    descriptionVi: "Vô hiệu hóa vĩnh viễn một API Key để ngừng cấp quyền kết nối.",
    descriptionEn: "Permanently revoked an API key.",
    category: "integration",
  },
  {
    code: "TOGGLE_API_KEY",
    labelVi: "Bật/tắt khóa API",
    labelEn: "Toggle API Key",
    descriptionVi: "Tạm khóa hoặc mở lại một API Key.",
    descriptionEn: "Enabled or paused an API key.",
    category: "integration",
  },
  {
    code: "CREATE_WEBHOOK",
    labelVi: "Tạo Webhook",
    labelEn: "Create Webhook",
    descriptionVi: "Đăng ký địa chỉ nhận thông báo sự kiện tự động sang hệ thống bên ngoài.",
    descriptionEn: "Registered a new outbound webhook endpoint.",
    category: "integration",
  },
  {
    code: "UPDATE_WEBHOOK",
    labelVi: "Cập nhật Webhook",
    labelEn: "Update Webhook",
    descriptionVi: "Thay đổi URL, sự kiện đăng ký hoặc trạng thái của Webhook.",
    descriptionEn: "Updated webhook endpoint configuration.",
    category: "integration",
  },
  {
    code: "DELETE_WEBHOOK",
    labelVi: "Xóa Webhook",
    labelEn: "Delete Webhook",
    descriptionVi: "Xóa bỏ một điểm nhận Webhook.",
    descriptionEn: "Deleted a webhook endpoint.",
    category: "integration",
  },
  {
    code: "TRIGGER_WEBHOOK_RETRY",
    labelVi: "Gửi lại Webhook",
    labelEn: "Retry Webhook Delivery",
    descriptionVi: "Thử gửi lại thông báo Webhook trước đó bị lỗi kết nối.",
    descriptionEn: "Re-queued a failed webhook delivery.",
    category: "integration",
  },
];

const ACTION_MAP = new Map<string, AuditActionMeta>(
  AUDIT_ACTION_DICTIONARY.map((item) => [item.code, item]),
);

function formatFallbackLabel(action: string): string {
  return action
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function getAuditActionInfo(action: string, locale: string = "vi-VN"): AuditActionInfo {
  const isVi = locale === "vi-VN";
  const normalized = (action || "").trim().toUpperCase();
  const entry = ACTION_MAP.get(normalized);

  if (entry) {
    return {
      code: entry.code,
      label: isVi ? entry.labelVi : entry.labelEn,
      description: isVi ? entry.descriptionVi : entry.descriptionEn,
      category: entry.category,
    };
  }

  return {
    code: action,
    label: formatFallbackLabel(action),
    description: isVi
      ? `Hành động hệ thống: ${action}`
      : `System action: ${action}`,
    category: "other",
  };
}
