"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthContext, type AuthStatus } from "@/contexts/AuthContext";
import type { MeDto } from "@/types/auth.types";
import { authService } from "@/services/auth.service";
import { ApiError, ensureFreshAccessToken, purgeSessionCookies } from "@/lib/axios";
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
          await ensureFreshAccessToken();
        }
        if (!cancelled) {
          setUser(me);
          setStatus("authenticated");
          recordActivity();
        }
      } catch (error) {
        // 401 + refresh fail: interceptor đã clear token + phát auth:session-expired.
        // Lỗi mạng cũng rơi vào đây — trạng thái an toàn là unauthenticated.
        if (!cancelled) {
          tokenStore.clear();
          setUser(null);
          clearLoginPersistence();
          // Purge session cookies nếu lỗi là 401/403 (phiên không còn hợp lệ trên server)
          // TRƯỚC KHI setStatus("unauthenticated") để proxy.ts không bị bounce loop /login -> / -> /login
          if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
            await purgeSessionCookies();
          }
          if (!cancelled) {
            setStatus("unauthenticated");
          }
        }
      }
    }

    void restoreSession();
    const unsubscribe = eventBus.on("auth:session-expired", handleSessionExpired);
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

        if (!haveSameSiteIds(tokenSiteIds, meSiteIds) || !haveSameSiteIds(userSiteIds, meSiteIds)) {
          await ensureFreshAccessToken();
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
  }, [status, user?.siteIds]);

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
