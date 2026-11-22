import {
  getConfig,
  isFeatureFlagEnabled,
  SYSTEM_CONFIG_KEYS,
} from "@/lib/system-config";
import type { SystemPublicConfig } from "@/types";

export type SocialLoginSlotState = "loading" | "enabled" | "hidden";

export interface ResolveSocialLoginSlotInput {
  mounted: boolean;
  isPending: boolean;
  isError: boolean;
  publicConfig: SystemPublicConfig | undefined;
}

/**
 * Xác định trạng thái hiển thị của vùng đăng nhập Google trên form đăng nhập.
 * Luôn trả về "loading" trước khi client mount để đồng bộ HTML giữa SSR prerender
 * và hydrate đầu tiên, tránh nhảy bố cục (CLS) khi kết hợp với slot cố định chiều cao.
 */
export function resolveSocialLoginSlotState({
  mounted,
  isPending,
  isError,
  publicConfig,
}: ResolveSocialLoginSlotInput): SocialLoginSlotState {
  if (!mounted) return "loading";

  if (publicConfig !== undefined) {
    return isFeatureFlagEnabled(
      getConfig(publicConfig, SYSTEM_CONFIG_KEYS.socialLoginEnabled, false),
    )
      ? "enabled"
      : "hidden";
  }

  if (isPending && !isError) return "loading";
  return "hidden";
}

