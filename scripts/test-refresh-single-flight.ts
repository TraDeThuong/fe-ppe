/**
 * Test E2E cho Bước 2 (lib/axios): refresh single-flight chống backend THẬT.
 *
 * Chạy: npx tsx scripts/test-refresh-single-flight.ts
 * Yêu cầu: identity-service (hoặc gateway) đang chạy, DB đã seed (user@ppe.local).
 *
 * Cách test TOKEN_EXPIRED: backend dev tự sinh RSA keypair trong memory mỗi lần
 * khởi động nên không forge được token RS256; nhưng verifyAccessToken chấp nhận
 * cả HS256 ký bằng JWT_ACCESS_SECRET. Script đọc secret này từ .env của
 * identity-service LÚC CHẠY — không nhúng credential vào repo.
 */
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";

const IDENTITY_ENV_PATH = "/Users/thanhtra/D08/D08-DATN/smart-ppe-identity-service/.env";
const TEST_EMAIL = "admin@ppe.local";
const TEST_PASSWORD = "Admin@123456";

let failed = 0;
function assert(cond: unknown, msg: string): void {
  if (cond) {
    console.log(`  ✅ ${msg}`);
  } else {
    failed++;
    console.error(`  ❌ ${msg}`);
  }
}

function signExpiredAccessToken(accessSecret: string, payload: Record<string, unknown>): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, purpose: "ACCESS", iat: now - 120, exp: now - 60 };
  const b64u = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const h = b64u(header);
  const p = b64u(body);
  const sig = createHmac("sha256", accessSecret).update(`${h}.${p}`).digest("base64url");
  return `${h}.${p}.${sig}`;
}

interface LoginData {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; role: string; roleId: string; permissions: string[] };
}

async function main(): Promise<void> {
  const identityEnv = readFileSync(IDENTITY_ENV_PATH, "utf-8");
  const accessSecretMatch = identityEnv.match(/^JWT_ACCESS_SECRET="([^"]+)"/m);
  if (!accessSecretMatch) {
    console.error(`Không tìm thấy JWT_ACCESS_SECRET trong ${IDENTITY_ENV_PATH}`);
    process.exit(1);
  }
  const accessSecret = accessSecretMatch[1];

  // Set env TRƯỚC khi import lib (env.ts đọc process.env lúc module load)
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:80/api/v1";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  const { apiClient, ApiError } = await import("@/lib/axios");
  const { tokenStore } = await import("@/lib/token");

  // ── 1. Login bằng seed user ────────────────────────────────────────────
  console.log("1. Login bằng seed user");
  const login = (await apiClient.post("/auth/login", {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  })) as LoginData;
  assert(
    typeof login.accessToken === "string" && typeof login.refreshToken === "string",
    "Login trả accessToken + refreshToken (đã unwrap qua interceptor)",
  );
  tokenStore.setTokens(login.accessToken, login.refreshToken);

  // ── 2. Baseline: /me với access token hợp lệ ────────────────────────────
  console.log("2. GET /auth/me với access token hợp lệ");
  const me = (await apiClient.get("/auth/me")) as { id: string };
  assert(me.id === login.user.id, "GET /auth/me thành công, đúng user");

  // ── 3. Core: 3 request song song với access token HẾT HẠN ────────────────
  console.log("3. 3 request song song với access token hết hạn");
  tokenStore.setTokens(
    signExpiredAccessToken(accessSecret, login.user),
    tokenStore.getRefreshToken() as string,
  );

  const results = await Promise.allSettled([
    apiClient.get("/auth/me"),
    apiClient.get("/auth/me"),
    apiClient.get("/auth/me"),
  ]);
  const allOk = results.every((r) => r.status === "fulfilled");
  assert(allOk, "Cả 3 request 401 TOKEN_EXPIRED đều được refresh + retry thành công");

  // ── 4. Session KHÔNG bị revoke → chứng minh không có refresh race ─────────
  // Nếu 2+ request refresh chạy song song, 1 cái sẽ reuse token cũ → backend
  // revoke TOÀN BỘ session → /me kế tiếp sẽ 401.
  console.log("4. Kiểm tra session không bị revoke (chứng minh single-flight)");
  const meAfter = (await apiClient.get("/auth/me")) as { id: string };
  assert(meAfter.id === login.user.id, "Session vẫn hợp lệ sau refresh — không có race");

  const rotAcc = tokenStore.getAccessToken();
  const rotRef = tokenStore.getRefreshToken();
  assert(rotAcc !== login.accessToken, "Access token đã rotate sang bản mới");
  assert(rotRef !== login.refreshToken, "Refresh token đã rotate sang bản mới");

  // ── 5. Refresh fail → clear tokenStore + reject ApiError ────────────────
  console.log("5. Refresh thất bại (refresh token rác)");
  tokenStore.setTokens(signExpiredAccessToken(accessSecret, login.user), "garbage-refresh-token");
  let rejected: unknown = null;
  try {
    await apiClient.get("/auth/me");
  } catch (e) {
    rejected = e;
  }
  assert(rejected instanceof ApiError, "Request bị reject bằng ApiError khi refresh fail");
  assert(
    tokenStore.getAccessToken() === null && tokenStore.getRefreshToken() === null,
    "tokenStore bị clear sau khi refresh fail",
  );

  // ── 6. Dọn dẹp: logout + xác minh session chết qua đường refresh ────────
  // Lưu ý: access token là JWT stateless — vẫn "sống" tới khi hết hạn dù đã
  // logout. Đường kiểm chứng đúng là refresh: refresh token đã bị xóa khỏi DB.
  console.log("6. Cleanup: logout + xác minh session chết");
  tokenStore.setTokens(rotAcc as string, rotRef as string);
  const logoutResp = (await apiClient.post("/auth/logout", {
    refreshToken: rotRef,
  })) as { message?: string };
  assert(typeof logoutResp.message === "string", "Logout trả message thành công");

  tokenStore.setTokens(signExpiredAccessToken(accessSecret, login.user), rotRef as string);
  let afterLogout: unknown = null;
  try {
    await apiClient.get("/auth/me");
  } catch (e) {
    afterLogout = e;
  }
  assert(
    afterLogout instanceof ApiError,
    "Sau logout, refresh token đã bị xóa khỏi DB → refresh fail → request bị reject",
  );

  // ── 7. Lỗi 422 zod trả errors[{field, message}] ──────────────────────────
  console.log("7. Validation 422");
  let validationError: unknown = null;
  try {
    await apiClient.post("/auth/login", { email: "khong-phai-email", password: "x" });
  } catch (e) {
    validationError = e;
  }
  assert(
    validationError instanceof ApiError &&
      validationError.status === 422 &&
      Array.isArray(validationError.errors) &&
      validationError.errors.length > 0,
    "422 trả ApiError kèm errors[{field, message}]",
  );

  console.log(failed === 0 ? "\n🎉 TẤT CẢ TEST ĐẠT" : `\n💥 ${failed} TEST THẤT BẠI`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("Test crash:", error);
  process.exit(1);
});
