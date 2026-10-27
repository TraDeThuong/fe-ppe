import axios from "axios";

import { apiClient } from "@/lib/axios";
import type {
  AuthTokensDto,
  AvatarConfirmPayload,
  AvatarConfirmResponse,
  AvatarUploadUrlPayload,
  AvatarUploadUrlResponse,
  ChangePasswordPayload,
  DeactivateConfirmPayload,
  DeactivateRequestPayload,
  Disable2FAPayload,
  Enable2FAPayload,
  Enable2FAResponse,
  ForgotPasswordPayload,
  GoogleAuthUrlParams,
  GoogleLoginPayload,
  GoogleUrlResponse,
  LinkSocialPayload,
  LinkSocialResponse,
  LoginPayload,
  LoginResponse,
  LoginSuccessResponse,
  LogoutPayload,
  MeDto,
  RefreshTokenPayload,
  RegenerateBackupCodesPayload,
  RegisterPayload,
  ResendVerificationPayload,
  ResetPasswordPayload,
  SessionDto,
  SocialAccount,
  SystemPublicConfig,
  TwoFactorSetupResponse,
  UpdateProfilePayload,
  Verify2FAPayload,
  VerifyEmailPayload,
} from "@/types";

/**
 * Service tầng Auth — Giao tiếp trực tiếp với Backend API qua apiClient (Traefik gateway).
 *
 * NGUYÊN TẮC THIẾT KẾ:
 * 1. 1 hàm = 1 endpoint backend (chuẩn RESTful & RPC).
 * 2. Chỉ gọi axios + unwrap dữ liệu (response interceptor trong apiClient đã unwrap data).
 * 3. Tuyệt đối KHÔNG import toast, router/redirect hay logic nghiệp vụ ở service layer.
 * 4. Ném ApiError khi request thất bại (đã được interceptor chuẩn hóa).
 * 5. Ngoại lệ duy nhất (Hàm 25): Upload binary lên presigned URL (Cloudflare R2) dùng axios thuần,
 *    không gắn Authorization header và không kích hoạt interceptor refresh token.
 */
export const authService = {
  // ── 1. Đăng ký & Kích hoạt tài khoản ────────────────────────────────────

  /**
   * 1. POST /auth/register
   * Ghi chú: Anti-enum — dù email đã tồn tại backend vẫn trả 201 để bảo vệ danh tính user.
   */
  async register(payload: RegisterPayload): Promise<{ message: string }> {
    return (await apiClient.post("/auth/register", payload)) as { message: string };
  },

  /**
   * 2. GET /auth/verify-email?token=...
   * Ghi chú: 400 TOKEN_INVALID hoặc TOKEN_EXPIRED nếu token không hợp lệ hoặc đã hết hạn.
   */
  async verifyEmail(payload: VerifyEmailPayload): Promise<{ message: string }> {
    return (await apiClient.get("/auth/verify-email", {
      params: { token: payload.token },
    })) as { message: string };
  },

  // ── 2. Đăng nhập, Phiên làm việc & Cấp mới Token ────────────────────────

  /**
   * 3. POST /auth/login
   * Trả về discriminated union (requires2FA = true | LoginSuccessResponse).
   * Lỗi có thể gặp: 423 ACCOUNT_LOCKED, 403 USER_INACTIVE, 401 INVALID_CREDENTIALS.
   */
  async login(payload: LoginPayload): Promise<LoginResponse> {
    return (await apiClient.post("/auth/login", payload)) as LoginResponse;
  },

  /**
   * 4. GET /auth/me
   * Lấy thông tin user hiện tại (phục hồi session, AuthGuard, quyền hạn).
   */
  async getMe(): Promise<MeDto> {
    return (await apiClient.get("/auth/me")) as MeDto;
  },

  /**
   * 5. POST /auth/refresh
   * Cấp lại cặp token mới (AccessToken & RefreshToken rotation).
   * Payload refreshToken là optional nếu client gửi kèm cookie HTTP-only.
   */
  async refresh(payload?: RefreshTokenPayload): Promise<AuthTokensDto> {
    return (await apiClient.post("/auth/refresh", payload ?? {})) as AuthTokensDto;
  },

  /**
   * 6. POST /auth/logout
   * Đăng xuất phiên hiện tại, hủy refresh token và xóa cookies.
   */
  async logout(payload?: LogoutPayload): Promise<{ message: string }> {
    return (await apiClient.post("/auth/logout", payload ?? {})) as { message: string };
  },

  // ── 3. Quên & Đặt lại mật khẩu, Gửi lại email xác thực ───────────────────

  /**
   * 7. POST /auth/forgot-password
   * Gửi link đặt lại mật khẩu qua email. Backend luôn trả 200 (chống enum).
   */
  async forgotPassword(payload: ForgotPasswordPayload): Promise<{ message: string }> {
    return (await apiClient.post("/auth/forgot-password", payload)) as { message: string };
  },

  /**
   * 8. POST /auth/reset-password
   * Đặt lại mật khẩu bằng token email. Thu hồi toàn bộ session đang hoạt động.
   */
  async resetPassword(payload: ResetPasswordPayload): Promise<{ message: string }> {
    return (await apiClient.post("/auth/reset-password", payload)) as { message: string };
  },

  /**
   * 9. POST /auth/resend-verification
   * Gửi lại email kích hoạt. Bắt 429 TOO_MANY_REQUESTS nếu gửi lại trước cooldown 60s.
   */
  async resendVerification(payload: ResendVerificationPayload): Promise<{ message: string }> {
    return (await apiClient.post("/auth/resend-verification", payload)) as { message: string };
  },

  // ── 4. Xác thực hai yếu tố (2FA / TOTP) ──────────────────────────────────

  /**
   * 10. POST /auth/2fa/setup
   * Khởi tạo cấu hình 2FA, trả về secret và otpauthUrl để hiển thị mã QR.
   */
  async setup2FA(): Promise<TwoFactorSetupResponse> {
    return (await apiClient.post("/auth/2fa/setup", {})) as TwoFactorSetupResponse;
  },

  /**
   * 11. POST /auth/2fa/enable
   * Bật 2FA sau khi quét QR. Trả về 8 mã dự phòng (backupCodes) chỉ 1 lần duy nhất.
   */
  async enable2FA(payload: Enable2FAPayload): Promise<Enable2FAResponse> {
    return (await apiClient.post("/auth/2fa/enable", payload)) as Enable2FAResponse;
  },

  /**
   * 12. POST /auth/2fa/verify
   * Xác thực mã OTP bước 2 sau login thường hoặc Google login khi có requires2FA.
   * Trả về kết quả đăng nhập thành công kèm cặp token và thông tin AuthUser.
   */
  async verify2FA(payload: Verify2FAPayload): Promise<LoginSuccessResponse> {
    return (await apiClient.post("/auth/2fa/verify", payload)) as LoginSuccessResponse;
  },

  /**
   * 13. POST /auth/2fa/disable
   * Tắt 2FA (yêu cầu mã TOTP và mật khẩu hiện tại nếu user có mật khẩu).
   */
  async disable2FA(payload: Disable2FAPayload): Promise<{ message: string }> {
    return (await apiClient.post("/auth/2fa/disable", payload)) as { message: string };
  },

  /**
   * 14. POST /auth/2fa/backup-codes/regenerate
   * Tạo lại 8 mã dự phòng mới (mã cũ lập tức bị vô hiệu hóa).
   */
  async regenerateBackupCodes(
    payload: RegenerateBackupCodesPayload,
  ): Promise<Enable2FAResponse> {
    return (await apiClient.post("/auth/2fa/backup-codes/regenerate", payload)) as Enable2FAResponse;
  },

  // ── 5. Đăng nhập & Liên kết mạng xã hội (Google / Social) ───────────────

  /**
   * 15. GET /auth/google/url
   * Lấy URL chuyển hướng sang màn hình đăng nhập Google OAuth2.
   */
  async getGoogleUrl(params?: GoogleAuthUrlParams): Promise<GoogleUrlResponse> {
    return (await apiClient.get("/auth/google/url", { params })) as GoogleUrlResponse;
  },

  /**
   * 16. POST /auth/google
   * Đăng nhập bằng Google idToken hoặc Authorization Code. Trả về LoginResponse (có thể requires2FA).
   */
  async googleLogin(payload: GoogleLoginPayload): Promise<LoginResponse> {
    return (await apiClient.post("/auth/google", payload)) as LoginResponse;
  },

  /**
   * 17. GET /auth/social
   * Lấy danh sách các tài khoản mạng xã hội đang liên kết với tài khoản.
   */
  async getSocialAccounts(): Promise<SocialAccount[]> {
    return (await apiClient.get("/auth/social")) as SocialAccount[];
  },

  /**
   * 18. POST /auth/social/link
   * Liên kết tài khoản mạng xã hội mới (Google) vào tài khoản hiện tại.
   */
  async linkSocial(payload: LinkSocialPayload): Promise<LinkSocialResponse> {
    return (await apiClient.post("/auth/social/link", payload)) as LinkSocialResponse;
  },

  /**
   * 19. DELETE /auth/social/:provider
   * Hủy liên kết tài khoản mạng xã hội. Cơ chế Anti-Lockout chặn hủy phương thức duy nhất.
   * provider là enum GOOGLE | ZALO (unlinkSocialAccountParamSchema).
   */
  async unlinkSocial(provider: "GOOGLE" | "ZALO"): Promise<{ message: string }> {
    return (await apiClient.delete(`/auth/social/${encodeURIComponent(provider)}`)) as {
      message: string;
    };
  },

  // ── 6. Quản lý phiên đăng nhập (Sessions) ────────────────────────────────

  /**
   * 20. GET /auth/sessions
   * Lấy danh sách các phiên đăng nhập đang hoạt động của tài khoản.
   */
  async getSessions(): Promise<SessionDto[]> {
    return (await apiClient.get("/auth/sessions")) as SessionDto[];
  },

  /**
   * 21. DELETE /auth/sessions/:id
   * Thu hồi phiên đăng nhập cụ thể theo sessionId.
   */
  async revokeSession(id: string): Promise<{ message: string }> {
    return (await apiClient.delete(`/auth/sessions/${encodeURIComponent(id)}`)) as {
      message: string;
    };
  },

  /**
   * 22. DELETE /auth/sessions
   * Thu hồi toàn bộ các phiên đăng nhập khác ngoại trừ phiên hiện tại.
   */
  async revokeOtherSessions(payload?: { refreshToken?: string }): Promise<{ message: string }> {
    return (await apiClient.delete("/auth/sessions", {
      data: payload ?? {},
    })) as { message: string };
  },

  // ── 7. Hồ sơ cá nhân & Đổi mật khẩu ─────────────────────────────────────

  /**
   * 23. PUT /auth/profile
   * Cập nhật thông tin hồ sơ (họ tên, avatarUrl, số điện thoại).
   */
  async updateProfile(payload: UpdateProfilePayload): Promise<{ message: string }> {
    return (await apiClient.put("/auth/profile", payload)) as { message: string };
  },

  /**
   * 24. PUT /auth/password
   * Đổi mật khẩu tài khoản. Backend sẽ thu hồi toàn bộ session và yêu cầu đăng nhập lại.
   */
  async changePassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
    return (await apiClient.put("/auth/password", payload)) as { message: string };
  },

  // ── 8. Tải lên Avatar (Presigned R2 Workflow) ────────────────────────────

  /**
   * 25a. POST /auth/avatar/upload-url
   * Lấy presigned URL và storage key từ backend để upload avatar lên Cloudflare R2.
   */
  async getAvatarUploadUrl(payload: AvatarUploadUrlPayload): Promise<AvatarUploadUrlResponse> {
    return (await apiClient.post("/auth/avatar/upload-url", payload)) as AvatarUploadUrlResponse;
  },

  /**
   * 25b. PUT [uploadUrl] (Ngoại lệ hàm 25)
   * Upload trực tiếp file/blob lên Cloudflare R2 qua presigned URL.
   * Dùng axios thuần (không interceptor auth, không thêm Authorization header, không refresh).
   */
  async uploadAvatarToPresignedUrl(
    uploadUrl: string,
    file: File | Blob,
    contentType: string,
  ): Promise<void> {
    try {
      await axios.put(uploadUrl, file, {
        headers: {
          "Content-Type": contentType,
        },
      });
    } catch {
      // Khi Cloudflare R2 bucket chưa cấu hình CORS cho origin trình duyệt,
      // tự động chuyển tiếp qua Next.js Server-Side Route để hoàn tất tải lên
      await axios.put("/api/avatar-upload", file, {
        headers: {
          "Content-Type": contentType,
          "x-upload-url": uploadUrl,
        },
      });
    }
  },

  /**
   * 26. POST /auth/avatar/confirm
   * Xác nhận hoàn tất upload avatar và lưu avatarUrl mới vào thông tin người dùng.
   */
  async confirmAvatar(payload: AvatarConfirmPayload): Promise<AvatarConfirmResponse> {
    return (await apiClient.post("/auth/avatar/confirm", payload)) as AvatarConfirmResponse;
  },

  // ── 9. Vô hiệu hóa tài khoản (Deactivate) ────────────────────────────────

  /**
   * 27. POST /auth/deactivate/request
   * Gửi yêu cầu vô hiệu hóa tài khoản (yêu cầu mật khẩu, gửi email xác nhận 15 phút).
   */
  async requestDeactivate(payload: DeactivateRequestPayload): Promise<{ message: string }> {
    return (await apiClient.post("/auth/deactivate/request", payload)) as { message: string };
  },

  /**
   * 28. POST /auth/deactivate/confirm
   * Xác nhận vô hiệu hóa tài khoản bằng token email. Xóa cookies và thu hồi toàn bộ phiên.
   */
  async confirmDeactivate(payload: DeactivateConfirmPayload): Promise<{ message: string }> {
    return (await apiClient.post("/auth/deactivate/confirm", payload)) as { message: string };
  },

  // ── 10. Cấu hình hệ thống (Public Config & Feature Flags) ────────────────

  /**
   * 29. GET /system/public
   * Lấy cấu hình public và feature flags khi ứng dụng khởi động.
   */
  async getPublicConfig(): Promise<SystemPublicConfig> {
    return (await apiClient.get("/system/public")) as SystemPublicConfig;
  },
};
