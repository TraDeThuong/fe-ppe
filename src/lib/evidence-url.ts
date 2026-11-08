import { env } from "@/config/env";

/**
 * Chuẩn hóa URL ảnh bằng chứng vi phạm PPE để tải chính xác trên trình duyệt.
 *
 * Xử lý an toàn các định dạng:
 * 1. URL tuyệt đối (http://, https://, blob:, data:) -> Giữ nguyên
 * 2. Đường dẫn API tương đối (/api/v1/...) -> Nối với Host API Gateway (Traefik)
 * 3. Đường dẫn tĩnh công khai (/images/..., /evidence/...) -> Giữ nguyên dưới dạng static asset Next.js
 * 4. Storage Key MinIO S3 (chưa có domain) -> Chuyển thành link MinIO ppe-evidences
 */
export function resolveEvidenceUrl(keyOrUrl?: string | null): string {
  if (!keyOrUrl || typeof keyOrUrl !== "string") return "";

  const trimmed = keyOrUrl.trim();
  if (!trimmed) return "";

  // 1. URL tuyệt đối hoặc base64 / blob
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  // 2. Đường dẫn ảnh bằng chứng từ AI Live Server (Port 8000)
  if (trimmed.startsWith("/api/jobs/") || trimmed.startsWith("/api/live/")) {
    return `http://127.0.0.1:8000${trimmed}`;
  }

  // 3. Đường dẫn API qua Gateway (VD: /api/v1/incidents/evidences/:id/download)
  if (trimmed.startsWith("/api/")) {
    const gatewayOrigin = env.apiBaseUrl ? env.apiBaseUrl.replace(/\/api\/v1\/?$/, "") : "";
    return `${gatewayOrigin}${trimmed}`;
  }

  // 3. Đường dẫn tĩnh trong thư mục public của Next.js (VD: /images/..., /evidence/..., /videos/..., /data/...)
  if (
    trimmed.startsWith("/images/") ||
    trimmed.startsWith("/evidence/") ||
    trimmed.startsWith("/videos/") ||
    trimmed.startsWith("/data/")
  ) {
    return trimmed;
  }
  if (
    trimmed.startsWith("images/") ||
    trimmed.startsWith("evidence/") ||
    trimmed.startsWith("videos/") ||
    trimmed.startsWith("data/")
  ) {
    return `/${trimmed}`;
  }

  // 4. Fallback cho MinIO Storage key dạng thô
  return `http://localhost:9000/ppe-evidences/${trimmed.replace(/^\/+/, "")}`;
}
