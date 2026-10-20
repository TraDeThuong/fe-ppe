import type { SystemPublicConfig } from "@/types";

/**
 * Helper đọc cấu hình public từ GET /system/public.
 * Nguồn BE: system-config.constant.ts — data là Record<string, unknown> PHẲNG
 * (dot-notation), nên đọc qua key string + fallback thay vì type cố định.
 */

/** Các key đã xác minh với BE (2026-10-19) */
export const SYSTEM_CONFIG_KEYS = {
  locale: "app.locale",
  timezone: "app.timezone",
  appName: "app.name",
  supportEmail: "app.support_email",
  registrationEnabled: "feature.registration.enabled",
  socialLoginEnabled: "feature.social_login.enabled",
} as const;

export function getConfig<T = unknown>(
  config: SystemPublicConfig | undefined,
  key: string,
  fallback?: T,
): T | undefined {
  if (!config) return fallback;
  const value = config[key];
  return (value === undefined || value === null ? fallback : value) as T;
}
