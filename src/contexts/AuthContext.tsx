"use client";

import { createContext, useContext } from "react";
import type { MeDto } from "@/types/auth.types";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
  user: MeDto | null;
  status: AuthStatus;
  /** Cập nhật user sau khi profile/2FA đổi trạng thái */
  setUser: (u: MeDto | null) => void;
  /** Gọi POST /auth/logout + clear token/cache — điều hướng do guard lo */
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
