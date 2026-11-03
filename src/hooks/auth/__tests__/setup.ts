/**
 * Preload setup for auth hook tests.
 * Ensures required env variables are present before any module import.
 */
if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:80/api/v1";
}
if (!process.env.NEXT_PUBLIC_APP_URL) {
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
}
if (!process.env.NEXT_PUBLIC_IDENTITY_URL) {
  process.env.NEXT_PUBLIC_IDENTITY_URL = "http://localhost:9999/api/v1";
}
