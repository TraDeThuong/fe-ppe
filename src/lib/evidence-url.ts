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
 * URL presigned (SigV4) được ký cho host nội bộ Docker: trình duyệt không tải được, và đổi host
 * sang localhost cũng làm sai chữ ký. Cách sửa duy nhất là cấu hình BE ký theo host public.
 */
export function isSignedInternalMinioUrl(url?: string | null): boolean {
  return isDockerInternalMinioUrl(url) && /[?&]X-Amz-Signature=/i.test(String(url));
}

let warnedSignedInternalUrl = false;
function warnUnreachableSignedEvidenceUrl() {
  if (warnedSignedInternalUrl) return;
  warnedSignedInternalUrl = true;
  console.warn(
    "[evidence] Presigned URL đang được ký cho host nội bộ ppe-minio nên trình duyệt không tải được (403). " +
      "Cần cấu hình PPE_MINIO_PUBLIC_ENDPOINT cho incident-service để BE ký theo host public.",
  );
}

/**
 * Gốc URL công khai của bucket bằng chứng (VD: `https://cdn.example.com/ppe-evidences`), cấu hình qua
 * `NEXT_PUBLIC_EVIDENCE_PUBLIC_BASE_URL`. Không có giá trị mặc định: khi bucket private (production),
 * ảnh phải đi qua presigned URL lấy từ `GET /evidences/:id/download-url`.
 * Đọc lúc gọi (không cache) để test có thể đổi biến môi trường.
 */
export function getEvidencePublicBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_EVIDENCE_PUBLIC_BASE_URL;
  return typeof raw === "string" ? raw.trim().replace(/\/+$/, "") : "";
}

function publicOriginOf(baseUrl: string): string {
  try {
    return new URL(baseUrl).origin;
  } catch {
    return "";
  }
}

/**
 * Chuẩn hóa URL ảnh bằng chứng vi phạm PPE để tải chính xác trên trình duyệt.
 *
 * Xử lý an toàn các định dạng:
 * 1. URL tuyệt đối (http://, https://, blob:, data:) -> Giữ nguyên. URL đã ký (SigV4) không bao giờ bị đổi host.
 * 2. Đường dẫn API tương đối (/api/v1/...) -> Nối với Host API Gateway (Traefik)
 * 3. Đường dẫn tĩnh công khai (/images/..., /evidence/...) -> Giữ nguyên dưới dạng static asset Next.js
 * 4. Storage Key thô -> Chỉ ghép khi có `NEXT_PUBLIC_EVIDENCE_PUBLIC_BASE_URL`, ngược lại trả "" để
 *    nơi gọi dùng presigned URL (xem `useEvidenceViewUrl`).
 */
export function resolveEvidenceUrl(keyOrUrl?: string | null): string {
  if (!keyOrUrl || typeof keyOrUrl !== "string") return "";

  const trimmed = keyOrUrl.trim();
  if (!trimmed) return "";

  // 1. URL trỏ host nội bộ Docker (ppe-minio). URL đã ký gắn chữ ký với host nên giữ nguyên
  // (đổi host chỉ làm hỏng chữ ký); URL chưa ký thì đổi sang origin public nếu đã cấu hình.
  if (isDockerInternalMinioUrl(trimmed)) {
    if (isSignedInternalMinioUrl(trimmed)) {
      warnUnreachableSignedEvidenceUrl();
      return trimmed;
    }
    const publicOrigin = publicOriginOf(getEvidencePublicBaseUrl());
    return publicOrigin
      ? trimmed.replace(/^https?:\/\/(?:ppe-minio|minio)(?::\d+)?/i, publicOrigin)
      : trimmed;
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

  // 4. Storage key thô: chỉ ghép khi bucket công khai được cấu hình rõ ràng
  const publicBase = getEvidencePublicBaseUrl();
  return publicBase ? `${publicBase}/${trimmed.replace(/^\/+/, "")}` : "";
}
