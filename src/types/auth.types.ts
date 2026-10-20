/**
 * Contract Auth theo Backend smart-ppe-identity-service.
 * Nguồn đối chiếu:
 * - DTOs: smart-ppe-identity-service/src/modules/auth/auth.dto.ts
 * - Validations: smart-ppe-identity-service/src/modules/auth/auth.validation.ts
 */

// ============================================================================
// 1. NGƯỜI DÙNG & PHIÊN ĐĂNG NHẬP (USER & SESSION)
// ============================================================================

/**
 * Nguồn: auth.dto.ts:17-30 (GET /auth/me)
 * Trả về thông tin đầy đủ của user đang đăng nhập. Phục vụ phục hồi session và AuthGuard.
 */
export interface MeDto {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  phoneNumber: string | null;
  role: string;
  roleId: string;
  permissions: string[];
  isActive: boolean;
  twoFactorEnabled: boolean;
  mustChangePassword?: boolean;
  /** Chuỗi ISO date nhận qua JSON (Date trên DTO backend) */
  createdAt: string;
}

/**
 * Nguồn: auth.dto.ts:32-46 — Đối tượng user trong response Login.
 * LƯU Ý ĐẶC BIỆT: `mustChangePassword` CHỈ có ở luồng login thường (email/password).
 * Response từ `/auth/2fa/verify` và `/auth/google` KHÔNG trả field này -> khai optional.
 */
export interface AuthUser {
  id: string;
  email: string | null;
  fullName: string | null;
  role: string;
  roleId: string;
  permissions: string[];
  mustChangePassword?: boolean;
}

/**
 * Nguồn: auth.dto.ts:12-15
 * Cặp token trả về từ login thường, verify 2FA hoặc refresh token.
 */
export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
}

export interface LoginSuccessResponse {
  requires2FA?: false;
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface Login2FARequiredResponse {
  requires2FA: true;
  tempToken: string;
}

/**
 * Nguồn: auth.dto.ts:32-46 (POST /auth/login, POST /auth/google)
 * Bắt buộc dùng Discriminated Union để TypeScript ép xử lý nhánh 2FA ở mọi nơi sử dụng:
 * 1. Nếu requires2FA: true -> chỉ có tempToken (chờ người dùng nhập OTP)
 * 2. Nếu requires2FA: false (hoặc undefined) -> có đủ cặp token và thông tin AuthUser
 */
export type LoginResponse = Login2FARequiredResponse | LoginSuccessResponse;

/**
 * Nguồn: auth.service.ts:1277-1292 (GET /auth/sessions)
 * Danh sách phiên đăng nhập của tài khoản trên các thiết bị.
 * `isCurrent` backend LUÔN trả (boolean, so khớp hash token) — không phải optional.
 */
export interface SessionDto {
  id: string;
  deviceName: string;
  ipAddress: string;
  createdAt: string;
  isCurrent: boolean;
}

// ============================================================================
// 2. ĐĂNG KÝ, ĐĂNG NHẬP & PHỤC HỒI MẬT KHẨU
// ============================================================================

/** Nguồn: auth.validation.ts:4-7 (POST /auth/login) */
export interface LoginPayload {
  email: string;
  password: string;
}

/** Nguồn: auth.validation.ts:21-35 (POST /auth/register) */
export interface RegisterPayload {
  email: string;
  password: string;
  fullName?: string;
  turnstileToken?: string;
}

/** Nguồn: auth.validation.ts:41-47 (GET /auth/verify-email?token=...) */
export interface VerifyEmailPayload {
  token: string;
}

/** Nguồn: auth.validation.ts:100-103 (POST /auth/resend-verification) */
export interface ResendVerificationPayload {
  email: string;
  turnstileToken?: string;
}

/** Nguồn: auth.validation.ts:81-84 (POST /auth/forgot-password) */
export interface ForgotPasswordPayload {
  email: string;
  turnstileToken?: string;
}

/** Nguồn: auth.validation.ts:86-98 (POST /auth/reset-password) */
export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

/** Nguồn: auth.validation.ts:9-11 (POST /auth/refresh) */
export interface RefreshTokenPayload {
  refreshToken: string;
}

/** Nguồn: auth.validation.ts:13-15 (POST /auth/logout) */
export interface LogoutPayload {
  refreshToken?: string;
}

// ============================================================================
// 3. XÁC THỰC HAI YẾU TỐ (2FA / TOTP)
// ============================================================================

/** Nguồn: auth.dto.ts:96-99 (POST /auth/2fa/setup) */
export interface TwoFactorSetupResponse {
  secret: string;
  otpauthUrl: string;
}

/** Nguồn: auth.validation.ts:136-141 (POST /auth/2fa/enable) */
export interface Enable2FAPayload {
  code: string;
  secret?: string;
}

/**
 * Nguồn: auth.dto.ts:106-108 (POST /auth/2fa/enable, POST /auth/2fa/backup-codes/regenerate)
 * Trả về 8 mã dự phòng (backupCodes), chỉ trả 1 lần duy nhất lúc bật hoặc tạo lại.
 */
export interface Enable2FAResponse {
  backupCodes: string[];
}

/** Nguồn: auth.validation.ts:143-149 (POST /auth/2fa/verify) */
export interface Verify2FAPayload {
  tempToken: string;
  code: string;
}

/** Nguồn: auth.validation.ts:151-157 (POST /auth/2fa/disable) */
export interface Disable2FAPayload {
  code: string;
  password?: string;
}

/** Nguồn: auth.validation.ts:159-168 (POST /auth/2fa/backup-codes/regenerate) */
export interface RegenerateBackupCodesPayload {
  code: string;
  password?: string;
}

// ============================================================================
// 4. MẠNG XÃ HỘI (SOCIAL LOGIN & GOOGLE)
// ============================================================================

/** Nguồn: auth.dto.ts:131-134 (GET /auth/google/url query params) */
export interface GoogleAuthUrlParams {
  redirectUri?: string;
  state?: string;
}

/** Nguồn: auth.dto.ts:136-138 (GET /auth/google/url) */
export interface GoogleUrlResponse {
  url: string;
}

/** Nguồn: auth.validation.ts:170-206 (POST /auth/google) */
export type GoogleLoginPayload =
  | { idToken: string; code?: never; redirectUri?: never }
  | { code: string; redirectUri: string; idToken?: never };

/** Nguồn: auth.dto.ts:147-152 (GET /auth/social) */
export interface SocialAccount {
  id: string;
  /** Backend khai `string` (không phải enum) — dữ liệu lưu DB có thể mở rộng provider mới */
  provider: string;
  providerUserId: string;
  createdAt: string;
}

/**
 * Nguồn: auth.validation.ts:216-261 (POST /auth/social/link)
 * provider là enum GOOGLE | ZALO (schema default GOOGLE).
 * ZALO bắt buộc dùng `code` + `redirectUri`; GOOGLE dùng `idToken` hoặc `code`.
 */
export type LinkSocialPayload =
  | { provider: "GOOGLE" | "ZALO"; idToken: string; code?: never; redirectUri?: never }
  | { provider: "GOOGLE" | "ZALO"; code: string; redirectUri: string; idToken?: never };

/** Nguồn: auth.service.ts:716-720 (POST /auth/social/link) */
export interface LinkSocialResponse {
  provider: string;
  email: string | null;
}

// ============================================================================
// 5. QUẢN LÝ HỒ SƠ & BẢO MẬT (PROFILE, PASSWORD, AVATAR, DEACTIVATE)
// ============================================================================

/** Nguồn: auth.validation.ts:49-65 (PUT /auth/profile) */
export interface UpdateProfilePayload {
  fullName?: string;
  avatarUrl?: string;
  phoneNumber?: string;
}

/** Nguồn: auth.validation.ts:67-79 (PUT /auth/password) */
export interface ChangePasswordPayload {
  oldPassword?: string;
  newPassword: string;
}

/** Nguồn: auth.validation.ts:105-112 (POST /auth/avatar/upload-url) */
export interface AvatarUploadUrlPayload {
  contentType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
}

/** Nguồn: auth.dto.ts:76-81 (POST /auth/avatar/upload-url) */
export interface AvatarUploadUrlResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
}

/** Nguồn: auth.validation.ts:114-119 (POST /auth/avatar/confirm) */
export interface AvatarConfirmPayload {
  key: string;
}

/** Nguồn: auth.controller.ts:362 (POST /auth/avatar/confirm) */
export interface AvatarConfirmResponse {
  avatarUrl: string;
}

/** Nguồn: auth.validation.ts:121-126 (POST /auth/deactivate/request) */
export interface DeactivateRequestPayload {
  password: string;
  reason?: string;
}

/** Nguồn: auth.validation.ts:128-134 (POST /auth/deactivate/confirm) */
export interface DeactivateConfirmPayload {
  token: string;
}

// ============================================================================
// 6. CẤU HÌNH HỆ THỐNG TOÀN CỤC (SYSTEM PUBLIC CONFIG)
// ============================================================================

/**
 * Nguồn: system-config.constant.ts (GET /system/public)
 * Backend trả về Record phẳng (Record<string, unknown>):
 * - "app.locale" ("vi-VN")
 * - "app.timezone" ("Asia/Ho_Chi_Minh")
 * - "feature.registration.enabled"
 * - "feature.social_login.enabled"
 * - "app.name"
 * - "app.support_email"
 */
export type SystemPublicConfig = Record<string, unknown>;
