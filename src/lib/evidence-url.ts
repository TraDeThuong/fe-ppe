import { env } from "@/config/env";

const VIRTUAL_EVIDENCE_API_PATH_RE =
  /\/api\/v1\/(?:incidents\/)?evidences\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/download(?:-url)?(?:\?.*)?$/i;

/**
 * Trích xuất evidenceId nếu BE truyền đường dẫn tải ảo qua SSE/notification
 * (VD: `/api/v1/incidents/evidences/:id/download`), vì route thực tế trên BE là
 * `/api/v1/evidences/:id` và `/api/v1/evidences/:id/download-url`.
 */
export function extractEvidenceIdFromApiPath(keyOrUrl?: string | null): string | null {
  if (!keyOrUrl || typeof keyOrUrl !== "string") return null;
  const match = keyOrUrl.trim().match(VIRTUAL_EVIDENCE_API_PATH_RE);
  return match?.[1] ?? null;
}

/**
 * Kiểm tra URL có trỏ tới hostname nội bộ Docker (`ppe-minio` / `minio`) mà trình duyệt không phân giải được.
 */
export function isDockerInternalMinioUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  return /^https?:\/\/(?:ppe-minio|minio)(?::\d+)?\//i.test(url.trim());
}

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

  // 1. URL chứa hostname nội bộ Docker (ppe-minio:9000) -> Chuyển thành localhost cho trình duyệt
  if (trimmed.includes("ppe-minio:9000")) {
    return trimmed.replace(/http:\/\/ppe-minio:9000/g, "http://localhost:9000");
  }

  // 1b. URL tuyệt đối hoặc base64 / blob
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  // 2. Đường dẫn ảnh bằng chứng từ AI Live Server (đi qua Next.js rewrite same-origin, tránh CORS)
  if (trimmed.startsWith("/api/live/")) {
    return `/api/ai-test${trimmed.slice("/api".length)}`;
  }
  if (trimmed.startsWith("/api/jobs/")) {
    return trimmed;
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
