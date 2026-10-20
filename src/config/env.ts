export interface AppEnv {
  /** Base URL qua Traefik Gateway — mọi microservice đi qua cổng này */
  apiBaseUrl: string;
  /** URL identity-service trực tiếp (dev), fallback về apiBaseUrl */
  identityUrl: string;
  /** URL frontend — dùng cho redirectUri social login, link email */
  appUrl: string;
  /** Cloudflare Turnstile site key (public) — khi trống, widget không render */
  turnstileSiteKey: string | undefined;
}

const REQUIRED_VARS = [
  ["NEXT_PUBLIC_API_BASE_URL", process.env.NEXT_PUBLIC_API_BASE_URL],
  ["NEXT_PUBLIC_APP_URL", process.env.NEXT_PUBLIC_APP_URL],
] as const;

// Lưu ý: phải tham chiếu tĩnh (process.env.X, không phải process.env[key]) —
// Turbopack chỉ inline tham chiếu tĩnh vào client bundle, key động luôn undefined trên browser.
const missing = REQUIRED_VARS.filter(([, value]) => !value).map(([key]) => key);
if (missing.length > 0) {
  throw new Error(
    `Thiếu biến môi trường bắt buộc: ${missing.join(", ")}. Sao chép .env.example thành .env.local và điền giá trị.`,
  );
}

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const env: AppEnv = {
  apiBaseUrl: stripTrailingSlash(process.env.NEXT_PUBLIC_API_BASE_URL as string),
  identityUrl: stripTrailingSlash(
    (process.env.NEXT_PUBLIC_IDENTITY_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL) as string,
  ),
  appUrl: stripTrailingSlash(process.env.NEXT_PUBLIC_APP_URL as string),
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY as string | undefined,
};
