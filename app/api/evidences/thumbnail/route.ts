import { NextRequest, NextResponse } from "next/server";

const FETCH_TIMEOUT_MS = 6_000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>([
    "http://localhost:9000",
    "http://127.0.0.1:9000",
    "http://ppe-minio:9000",
    "http://minio:9000",
    "http://localhost:80",
    "http://localhost",
    "http://127.0.0.1:80",
    "http://127.0.0.1",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:8893",
    "http://127.0.0.1:8893",
  ]);

  const envUrls = [
    process.env.NEXT_PUBLIC_API_BASE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.MINIO_PUBLIC_URL,
    process.env.AI_ENGINE_URL,
  ];

  for (const raw of envUrls) {
    if (!raw) continue;
    try {
      origins.add(new URL(raw).origin);
    } catch {
      // Ignore malformed env URL
    }
  }
  return origins;
}

function resolveSafeTargetUrl(
  rawParam: string | null,
  req: NextRequest,
): URL | null {
  if (!rawParam || rawParam.length > 2048) return null;
  const trimmed = rawParam.trim();
  if (!trimmed) return null;

  try {
    // Cho phép đường dẫn tương đối thuộc chính FE (VD: /api/ai-test/..., /images/...)
    if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
      return new URL(trimmed, req.nextUrl.origin);
    }

    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    // Chặn thông tin đăng nhập nhúng trong URL
    if (parsed.username || parsed.password) {
      return null;
    }

    const allowed = getAllowedOrigins();
    allowed.add(req.nextUrl.origin);
    if (!allowed.has(parsed.origin)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Proxy ảnh bằng chứng same-origin (chống SSRF theo allowlist) giúp trình duyệt
 * có thể đọc pixel trên OffscreenCanvas/Canvas để tính Perceptual Hash (dHash)
 * mà không bị chặn CORS Tainted Canvas.
 */
export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url");
  const target = resolveSafeTargetUrl(rawUrl, req);
  if (!target) {
    return NextResponse.json(
      { message: "URL ảnh bằng chứng không hợp lệ hoặc không thuộc nguồn được phép." },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const upstreamHeaders: HeadersInit = {};
    const cookie = req.headers.get("cookie");
    const auth = req.headers.get("authorization");
    if (target.origin === req.nextUrl.origin && cookie) {
      upstreamHeaders["cookie"] = cookie;
    }
    if (auth) {
      upstreamHeaders["authorization"] = auth;
    }

    const upstream = await fetch(target.toString(), {
      method: "GET",
      headers: upstreamHeaders,
      signal: controller.signal,
      redirect: "error",
      cache: "force-cache",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { message: `Không tải được ảnh bằng chứng (HTTP ${upstream.status}).` },
        { status: upstream.status === 404 ? 404 : 502 },
      );
    }

    const contentType = upstream.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return NextResponse.json(
        { message: "Tài nguyên đích không phải là hình ảnh hợp lệ." },
        { status: 415 },
      );
    }

    const contentLength = Number(upstream.headers.get("content-length") || "0");
    if (contentLength > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { message: "Ảnh vượt quá giới hạn dung lượng cho phép." },
        { status: 413 },
      );
    }

    const buffer = await upstream.arrayBuffer();
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { message: "Ảnh vượt quá giới hạn dung lượng cho phép." },
        { status: 413 },
      );
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "private, max-age=3600",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      { message: isAbort ? "Hết thời gian tải ảnh bằng chứng." : "Lỗi kết nối nguồn ảnh." },
      { status: isAbort ? 504 : 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}
