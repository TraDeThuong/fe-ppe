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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = Boolean(
    request.cookies.get("accessToken") ?? request.cookies.get("refreshToken"),
  );

  if (matchesPrefix(pathname, PROTECTED_PREFIXES) && !hasSessionCookie) {
    const next = encodeURIComponent(pathname);
    return NextResponse.redirect(new URL(`/login?next=${next}`, request.url));
  }

  if (matchesPrefix(pathname, PUBLIC_AUTH_PREFIXES) && hasSessionCookie) {
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
