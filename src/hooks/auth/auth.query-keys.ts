import type { GoogleAuthUrlParams } from "@/types/auth.types";

// Mọi query key đi qua factory — dùng để invalidate chính xác, không hardcode rải rác
export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
  sessions: () => [...authKeys.all, "sessions"] as const,
  social: () => [...authKeys.all, "social"] as const,
  config: () => [...authKeys.all, "config"] as const,
  googleUrl: (params?: GoogleAuthUrlParams) =>
    [...authKeys.all, "google-url", params] as const,
};
