"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthContext, type AuthStatus } from "@/contexts/AuthContext";
import type { MeDto } from "@/types/auth.types";
import { authService } from "@/services/auth.service";
import { ApiError, ensureFreshAccessToken, purgeSessionCookies } from "@/lib/axios";
import { decodeJwtPayload } from "@/lib/jwt";
import { getAccessTokenSiteIds, tokenStore } from "@/lib/token";
import { queryClient } from "@/lib/query-client";
import { eventBus } from "@/lib/event-bus";
import { authKeys } from "@/hooks/auth/auth.query-keys";
import {
  clearLoginPersistence,
  hasStaleSessionTrace,
  isRememberMe,
  recordActivity,
  shouldRestoreSession,
} from "@/lib/session-manager";

function haveSameSiteIds(a?: readonly string[] | null, b?: readonly string[] | null): boolean {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((id) => setB.has(id));
}

interface AccessTokenClaims {
  id?: unknown;
  email?: unknown;
  role?: unknown;
  roleId?: unknown;
  siteId?: unknown;
  siteIds?: unknown;
  permissions?: unknown;
  mustChangePassword?: unknown;
}

const asString = (value: unknown): string | null => (typeof value === "string" ? value : null);
const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

/**
 * GET /auth/me trả 403 FORBIDDEN khi tài khoản đang bị ép đổi mật khẩu
 * (BE bản cũ chặn cả /auth/me — SEC-16). Phiên vẫn hợp lệ: thay vì xóa phiên và
 * đá về /login (deadlock — không bao giờ đổi được mật khẩu), dựng user tối thiểu
 * từ claim của access token (BE ký kèm mustChangePassword) để guard đưa người
 * dùng tới /change-password. Trả null nếu token không mang cờ này.
 */
async function resolveMustChangePasswordUser(): Promise<MeDto | null> {
  if (!tokenStore.getAccessToken()) {
    const refreshed = await ensureFreshAccessToken();
    if (!refreshed) return null;
  }
  const claims = decodeJwtPayload<AccessTokenClaims>(tokenStore.getAccessToken());
  if (!claims || claims.mustChangePassword !== true) return null;
  const id = asString(claims.id);
  const role = asString(claims.role);
  if (!id || !role) return null;
  const siteIds = asStringArray(claims.siteIds);
  return {
    id,
    email: asString(claims.email),
    fullName: null,
    avatarUrl: null,
    phoneNumber: null,
    role,
    roleId: asString(claims.roleId) ?? "",
    siteId: asString(claims.siteId) ?? siteIds[0] ?? null,
    siteIds,
    permissions: asStringArray(claims.permissions),
    isActive: true,
    twoFactorEnabled: false,
    mustChangePassword: true,
    createdAt: "",
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MeDto | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  // setUser phải đồng bộ CẢ status — nếu chỉ set user, status vẫn
  // "unauthenticated" (sau lần thăm dò 401 đầu) và guard redirect nhầm.
  const updateUser = useCallback((u: MeDto | null) => {
    setUser(u);
    setStatus(u ? "authenticated" : "unauthenticated");
  }, []);

  const clearClientSession = useCallback(() => {
    tokenStore.clear();
    queryClient.clear();
    clearLoginPersistence();
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("ppe_site");
      } catch {
        // Bỏ qua nếu storage không khả dụng
      }
    }
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const handleSessionExpired = useCallback(() => {
    clearClientSession();
    // Purge cookie httpOnly: BE không tự clear khi refresh fail, cookie cũ
    // sẽ khiến proxy bounce /login → / → /login mỗi lần tải trang.
    // Chỉ gọi ở đây (event = refresh bị BE từ chối thật sự), KHÔNG gọi ở
    // restore fail do lỗi mạng — session vẫn còn hiệu lực, F5 sau sẽ phục hồi.
    void purgeSessionCookies();
  }, [clearClientSession]);

  const logout = useCallback(async () => {
    let loggedOutOnServer = false;
    try {
      await authService.logout({
        refreshToken: tokenStore.getRefreshToken() ?? undefined,
      });
      loggedOutOnServer = true;
    } catch {
      // Phiên đã hết ở server — vẫn phải dọn sạch phía client
    } finally {
      clearClientSession();
      if (!loggedOutOnServer) {
        void purgeSessionCookies();
      }
    }
  }, [clearClientSession]);

  // Khôi phục phiên: memory trống sau reload nhưng cookie httpOnly vẫn sống.
  // fetchQuery qua react-query để dedup với useMe (Bước 6) và Strict Mode.
  useEffect(() => {
    let cancelled = false;
    let sessionExpiredDuringRestore = false;

    const unsubscribe = eventBus.on("auth:session-expired", () => {
      sessionExpiredDuringRestore = true;
      handleSessionExpired();
    });

    async function restoreSession() {
      // Kiểm tra tính năng Ghi nhớ đăng nhập:
      // Nếu không tích "Ghi nhớ đăng nhập" và phiên làm việc trước đó đã kết thúc
      // thì không tự động phục hồi phiên; chỉ purge cookie khi thực sự có dấu vết phiên cũ.
      if (!shouldRestoreSession()) {
        const shouldPurgeCookies = hasStaleSessionTrace();
        if (!cancelled) {
          tokenStore.clear();
          setUser(null);
          clearLoginPersistence();
          if (shouldPurgeCookies) {
            await purgeSessionCookies();
          }
          if (!cancelled) {
            setStatus("unauthenticated");
          }
        }
        return;
      }

      try {
        const me = await queryClient.fetchQuery({
          queryKey: authKeys.me(),
          queryFn: () => authService.getMe(),
        });
        // Đồng bộ JWT accessToken nếu memory trống hoặc siteIds trong JWT cũ lệch với DB (GET /auth/me)
        const tokenSiteIds = getAccessTokenSiteIds();
        if (!haveSameSiteIds(tokenSiteIds, me.siteIds ?? [])) {
          const refreshed = await ensureFreshAccessToken();
          // Nếu POST /auth/refresh thất bại (ví dụ refreshToken đã hết hạn hoặc bị thu hồi),
          // tuyệt đối KHÔNG được setStatus("authenticated") ghi đè lên trạng thái đã hết hạn,
          // tránh gây vòng lặp vô hạn /login -> / -> /dashboard -> /login với proxy.ts.
          if (
            !refreshed &&
            (sessionExpiredDuringRestore || !tokenStore.getAccessToken())
          ) {
            await purgeSessionCookies();
            if (!cancelled) {
              tokenStore.clear();
              queryClient.clear();
              clearLoginPersistence();
              setUser(null);
              setStatus("unauthenticated");
            }
            return;
          }
        }
        if (!cancelled && !sessionExpiredDuringRestore) {
          setUser(me);
          setStatus("authenticated");
          recordActivity();
        }
      } catch (error) {
        // 403 + mustChangePassword: phiên còn sống, chỉ bị giới hạn → giữ phiên
        if (
          error instanceof ApiError &&
          error.status === 403 &&
          !cancelled &&
          !sessionExpiredDuringRestore
        ) {
          const restricted = await resolveMustChangePasswordUser().catch(() => null);
          if (restricted && !cancelled && !sessionExpiredDuringRestore) {
            queryClient.setQueryData(authKeys.me(), restricted);
            setUser(restricted);
            setStatus("authenticated");
            recordActivity();
            return;
          }
        }
        // 401 + refresh fail: interceptor đã clear token + phát auth:session-expired.
        // Lỗi mạng/5xx cũng rơi vào đây — chỉ xóa persistence & cookie khi phiên bị BE từ chối (401/403).
        if (!cancelled) {
          tokenStore.clear();
          setUser(null);
          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            clearLoginPersistence();
            await purgeSessionCookies();
          }
          if (!cancelled) {
            setStatus("unauthenticated");
          }
        }
      }
    }

    void restoreSession();
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [handleSessionExpired]);

  // Tự động đồng bộ lại phạm vi công trường (siteIds) và làm mới JWT khi người dùng chuyển tab/cửa sổ
  useEffect(() => {
    if (status !== "authenticated") return;
    let syncing = false;

    const handleVisibilityOrFocus = async () => {
      if (document.visibilityState === "hidden" || syncing) return;
      syncing = true;
      try {
        const me = await authService.getMe();
        queryClient.setQueryData(authKeys.me(), me);
        const tokenSiteIds = getAccessTokenSiteIds();
        const meSiteIds = me.siteIds ?? [];
        const userSiteIds = user?.siteIds ?? [];
        const siteScopeChanged =
          !haveSameSiteIds(tokenSiteIds, meSiteIds) ||
          !haveSameSiteIds(userSiteIds, meSiteIds);
        const permissionsChanged =
          user?.role !== me.role ||
          !haveSameSiteIds(user?.permissions ?? [], me.permissions ?? []);

        if (siteScopeChanged) {
          const refreshed = await ensureFreshAccessToken();
          if (!refreshed && !tokenStore.getAccessToken()) {
            return;
          }
          setUser(me);
          void queryClient.invalidateQueries();
        } else if (permissionsChanged) {
          setUser(me);
          void queryClient.invalidateQueries();
        }
      } catch {
        // Bỏ qua lỗi mạng tạm thời khi focus tab
      } finally {
        syncing = false;
      }
    };

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    return () => {
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, [status, user?.siteIds, user?.role, user?.permissions]);

  // Khi đang đăng nhập và không bật "Ghi nhớ đăng nhập", duy trì timestamp hoạt động
  useEffect(() => {
    if (status !== "authenticated" || isRememberMe()) return;

    const timer = setInterval(() => {
      recordActivity();
    }, 5000);

    const handleUserActivity = () => {
      recordActivity();
    };

    window.addEventListener("pointerdown", handleUserActivity, { passive: true });
    window.addEventListener("keydown", handleUserActivity, { passive: true });

    return () => {
      clearInterval(timer);
      window.removeEventListener("pointerdown", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
    };
  }, [status]);

  return (
    <AuthContext.Provider value={{ user, status, setUser: updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
