"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient } from "@/lib/query-client";
import { authKeys } from "@/hooks/auth/auth.query-keys";
import { authService } from "@/services/auth.service";

const PREFETCH_SESSIONS_ROLES = ["ADMIN", "SUPERVISOR"];

/**
 * Prefetch theo role sau khi xác thực — hiện chỉ prefetch sessions
 * (giá trị thật nằm ở các domain sites/incidents ở hành trình sau).
 */
export function PrefetchProvider({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuth();

  useEffect(() => {
    if (status !== "authenticated" || !user) return;
    if (!PREFETCH_SESSIONS_ROLES.includes(user.role)) return;

    void queryClient.prefetchQuery({
      queryKey: authKeys.sessions(),
      queryFn: () => authService.getSessions(),
      staleTime: 5 * 60 * 1000,
    });
  }, [status, user]);

  return <>{children}</>;
}
