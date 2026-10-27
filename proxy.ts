import { NextResponse, type NextRequest } from "next/server";

// Route guard LỚP 1 (optimistic, chạy trước render): chỉ check sự hiện diện
// cookie accessToken/refreshToken (httpOnly vẫn đọc được ở server).
// KHÔNG verify JWT ở đây — verify thật do GET /auth/me ở client (AuthProvider).
const PROTECTED_PREFIXES = ["/dashboard", "/change-password", "/settings"];
// /2fa nằm trong nhóm (public): giữa luồng 2FA user CHƯA có session cookie
// (tempToken ở sessionStorage) — nếu coi là protected, proxy sẽ đá về /login.
// Người ĐÃ đăng nhập vào /2fa thì redirect về / là hành vi đúng.
const PUBLIC_AUTH_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/2fa",
  "/auth",
];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Trang xác nhận vô hiệu hóa tài khoản — user đang đăng nhập bấm link trong
// email; không được đá về "/" dù nằm trong prefix public /verify-email
const DEACTIVATE_CONFIRM_PREFIX = "/verify-email/deactivate";
// Callback OAuth phải chạy được cho CẢ user đang đăng nhập (link Google từ
// /settings/security) lẫn user chưa đăng nhập (đăng nhập bằng Google)
const OAUTH_CALLBACK_PREFIX = "/auth/callback";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasRawAuthCookie = Boolean(
    request.cookies.get("accessToken") ?? request.cookies.get("refreshToken"),
  );
  const hasRememberMe = Boolean(request.cookies.get("ppe_remember_me"));
  const hasActiveSession = Boolean(request.cookies.get("ppe_session_active"));

  // Phiên đăng nhập được coi là còn hiệu lực nếu có token VÀ (chọn ghi nhớ HOẶC tab/trình duyệt đang trong phiên làm việc)
  const hasSessionCookie = Boolean(
    hasRawAuthCookie && (hasRememberMe || hasActiveSession),
  );

  if (matchesPrefix(pathname, PROTECTED_PREFIXES) && !hasSessionCookie) {
    const next = encodeURIComponent(pathname);
    return NextResponse.redirect(new URL(`/login?next=${next}`, request.url));
  }

  if (
    matchesPrefix(pathname, PUBLIC_AUTH_PREFIXES) &&
    !pathname.startsWith(DEACTIVATE_CONFIRM_PREFIX) &&
    !pathname.startsWith(OAUTH_CALLBACK_PREFIX) &&
    hasSessionCookie
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/change-password/:path*",
    "/settings/:path*",
    "/login/:path*",
    "/register/:path*",
    "/forgot-password/:path*",
    "/reset-password/:path*",
    "/verify-email/:path*",
    "/2fa/:path*",
    "/auth/:path*",
  ],
};
