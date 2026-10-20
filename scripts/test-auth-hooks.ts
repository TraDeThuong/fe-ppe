import assert from "node:assert/strict";
import { authKeys } from "../src/hooks/auth/auth.query-keys";
import { shouldToastError } from "../src/hooks/auth/auth-hook-utils";
import { ApiError } from "../src/lib/axios";
import { ErrorCode } from "../src/types";

// Import all hooks from index barrel
import {
  useMe,
  useSessions,
  useSocialAccounts,
  usePublicConfig,
  useGoogleUrl,
  useLogin,
  useGoogleLogin,
  useLogout,
  useRegister,
  useVerifyEmail,
  useResendVerification,
  useForgotPassword,
  useResetPassword,
  useChangePassword,
  useSetup2FA,
  useEnable2FA,
  useVerify2FA,
  useDisable2FA,
  useRegenerateBackupCodes,
  useLinkSocial,
  useUnlinkSocial,
  useRevokeSession,
  useRevokeOtherSessions,
  useUpdateProfile,
  useAvatarUpload,
  useRequestDeactivate,
  useConfirmDeactivate,
} from "../src/hooks/auth";

console.log("=== KIỂM THỬ TẦNG HOOKS AUTH (BƯỚC 6) ===");

// 1. Kiểm tra xuất đầy đủ 27 hooks
const expectedHooks = [
  ["useMe", useMe],
  ["useSessions", useSessions],
  ["useSocialAccounts", useSocialAccounts],
  ["usePublicConfig", usePublicConfig],
  ["useGoogleUrl", useGoogleUrl],
  ["useLogin", useLogin],
  ["useGoogleLogin", useGoogleLogin],
  ["useLogout", useLogout],
  ["useRegister", useRegister],
  ["useVerifyEmail", useVerifyEmail],
  ["useResendVerification", useResendVerification],
  ["useForgotPassword", useForgotPassword],
  ["useResetPassword", useResetPassword],
  ["useChangePassword", useChangePassword],
  ["useSetup2FA", useSetup2FA],
  ["useEnable2FA", useEnable2FA],
  ["useVerify2FA", useVerify2FA],
  ["useDisable2FA", useDisable2FA],
  ["useRegenerateBackupCodes", useRegenerateBackupCodes],
  ["useLinkSocial", useLinkSocial],
  ["useUnlinkSocial", useUnlinkSocial],
  ["useRevokeSession", useRevokeSession],
  ["useRevokeOtherSessions", useRevokeOtherSessions],
  ["useUpdateProfile", useUpdateProfile],
  ["useAvatarUpload", useAvatarUpload],
  ["useRequestDeactivate", useRequestDeactivate],
  ["useConfirmDeactivate", useConfirmDeactivate],
] as const;

for (const [name, fn] of expectedHooks) {
  assert.equal(typeof fn, "function", `Hook ${name} phải là function hợp lệ`);
}
console.log(`✓ Đã kiểm tra 27/27 hooks được định nghĩa và export chuẩn xác qua barrel index`);

// 2. Kiểm tra queryKeys factory
assert.deepEqual(authKeys.all, ["auth"]);
assert.deepEqual(authKeys.me(), ["auth", "me"]);
assert.deepEqual(authKeys.sessions(), ["auth", "sessions"]);
assert.deepEqual(authKeys.social(), ["auth", "social"]);
assert.deepEqual(authKeys.config(), ["auth", "config"]);
assert.deepEqual(authKeys.googleUrl({ redirectUri: "http://localhost:3000/callback" }), [
  "auth",
  "google-url",
  { redirectUri: "http://localhost:3000/callback" },
]);
console.log("✓ authKeys factory sinh query keys đúng định dạng phân cấp");

// 3. Kiểm tra logic lọc thông báo Toast (Ma trận lỗi & Interceptor deduplication)
// 3.1 Status 0 (mất mạng) -> Interceptor đã toast -> Hook KHÔNG toast đè
assert.equal(
  shouldToastError(new ApiError(0, "NETWORK_ERROR", "Mất kết nối")),
  false,
  "Status 0 phải được interceptor toast, mutation hook không toast",
);

// 3.2 Status 500 (lỗi máy chủ) -> Interceptor đã toast -> Hook KHÔNG toast đè
assert.equal(
  shouldToastError(new ApiError(500, "INTERNAL_SERVER_ERROR", "Lỗi máy chủ")),
  false,
  "Status 500 phải được interceptor toast, mutation hook không toast",
);

// 3.3 Status 429 RATE_LIMIT_EXCEEDED -> Interceptor đã toast -> Hook KHÔNG toast đè
assert.equal(
  shouldToastError(new ApiError(429, ErrorCode.RATE_LIMIT_EXCEEDED, "Quá nhiều yêu cầu")),
  false,
  "Status 429 RATE_LIMIT_EXCEEDED không toast trùng với interceptor",
);

// 3.4 Status 422 VALIDATION_ERROR -> Form hiển thị inline -> Hook KHÔNG toast đè
assert.equal(
  shouldToastError(
    new ApiError(422, ErrorCode.VALIDATION_ERROR, "Dữ liệu không hợp lệ", [
      { field: "email", message: "Email sai định dạng" },
    ]),
  ),
  false,
  "Status 422 VALIDATION_ERROR phải để form render inline, không toast",
);

// 3.5 suppressToast: true -> Hook KHÔNG toast
assert.equal(
  shouldToastError(new ApiError(401, ErrorCode.INVALID_CREDENTIALS, "Sai mật khẩu"), true),
  false,
  "suppressToast: true phải ngăn hook toast",
);

// 3.6 Lỗi nghiệp vụ (401 INVALID_CREDENTIALS, 403 USER_INACTIVE, 423 ACCOUNT_LOCKED, 400 TWO_FACTOR_INVALID_CODE)
// -> Interceptor KHÔNG toast -> Hook PHẢI toast đúng ngữ cảnh!
assert.equal(
  shouldToastError(new ApiError(401, ErrorCode.INVALID_CREDENTIALS, "Sai thông tin, còn 4 lần thử")),
  true,
  "Lỗi 401 INVALID_CREDENTIALS phải được hook toast",
);
assert.equal(
  shouldToastError(new ApiError(403, ErrorCode.USER_INACTIVE, "Tài khoản chưa được kích hoạt")),
  true,
  "Lỗi 403 USER_INACTIVE phải được hook toast",
);
assert.equal(
  shouldToastError(new ApiError(423, ErrorCode.ACCOUNT_LOCKED, "Tài khoản bị khóa 15 phút")),
  true,
  "Lỗi 423 ACCOUNT_LOCKED phải được hook toast",
);
assert.equal(
  shouldToastError(new ApiError(400, ErrorCode.TWO_FACTOR_INVALID_CODE, "Mã OTP không hợp lệ")),
  true,
  "Lỗi 400 TWO_FACTOR_INVALID_CODE phải được hook toast",
);
assert.equal(
  shouldToastError(new ApiError(409, ErrorCode.DUPLICATE_ENTRY, "Trùng lặp")),
  true,
  "Lỗi 409 DUPLICATE_ENTRY phải được hook toast",
);

console.log("✓ Cơ chế deduplication toast hoạt động 100% chuẩn xác theo ma trận xử lý lỗi");
console.log("=== TẤT CẢ KIỂM THỬ BƯỚC 6 ĐÃ VƯỢT QUA ===");
