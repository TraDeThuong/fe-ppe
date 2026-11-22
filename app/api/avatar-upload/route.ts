import { NextRequest, NextResponse } from "next/server";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

function isAllowedUploadUrl(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();
  // Chặn tuyệt đối metadata cloud & IP nội bộ không cấu hình
  if (
    hostname === "169.254.169.254" ||
    hostname === "metadata.google.internal" ||
    hostname === "0.0.0.0" ||
    hostname === "::1"
  ) {
    return false;
  }

  // Cho phép các host lưu trữ object storage (R2 / S3 / MinIO đã cấu hình)
  const configuredOrigins = [
    process.env.R2_PUBLIC_URL,
    process.env.MINIO_ENDPOINT,
    process.env.NEXT_PUBLIC_MINIO_PUBLIC_URL,
  ]
    .filter((v): v is string => Boolean(v && v.trim()))
    .map((v) => {
      try {
        return new URL(v).host.toLowerCase();
      } catch {
        return "";
      }
    })
    .filter(Boolean);

  if (
    (parsed.protocol === "https:" || parsed.protocol === "http:") &&
    configuredOrigins.includes(parsed.host.toLowerCase())
  ) {
    return true;
  }

  // Cho phép local MinIO dev (port 9000) khi không cấu hình biến môi trường
  if (
    (parsed.protocol === "http:" || parsed.protocol === "https:") &&
    (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "ppe-minio") &&
    parsed.port === "9000"
  ) {
    return true;
  }

  // Các presigned URL production bắt buộc HTTPS tới R2/S3
  if (parsed.protocol !== "https:") {
    return false;
  }

  return (
    hostname.endsWith(".r2.cloudflarestorage.com") ||
    hostname.endsWith(".amazonaws.com") ||
    hostname.endsWith(".r2.dev")
  );
}

export async function PUT(req: NextRequest) {
  try {
    const hasAuthCookie = Boolean(
      req.cookies.get("accessToken") ?? req.cookies.get("refreshToken"),
    );
    const hasAuthHeader = Boolean(req.headers.get("authorization"));
    if (!hasAuthCookie && !hasAuthHeader) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const uploadUrl = req.headers.get("x-upload-url");
    const rawContentType = (
      req.headers.get("content-type") || "image/jpeg"
    )
      .split(";")[0]
      .trim()
      .toLowerCase();

    if (!uploadUrl) {
      return NextResponse.json(
        { message: "Missing x-upload-url header" },
        { status: 400 },
      );
    }

    if (!isAllowedUploadUrl(uploadUrl)) {
      return NextResponse.json(
        { message: "Invalid or disallowed upload destination" },
        { status: 400 },
      );
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.has(rawContentType)) {
      return NextResponse.json(
        { message: "Unsupported avatar media type" },
        { status: 415 },
      );
    }

    const contentLengthHeader = req.headers.get("content-length");
    if (contentLengthHeader) {
      const declaredSize = Number(contentLengthHeader);
      if (Number.isFinite(declaredSize) && declaredSize > MAX_AVATAR_BYTES) {
        return NextResponse.json(
          { message: "Avatar payload exceeds 5MB limit" },
          { status: 413 },
        );
      }
    }

    const arrayBuffer = await req.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      return NextResponse.json(
        { message: "Empty upload payload" },
        { status: 400 },
      );
    }
    if (arrayBuffer.byteLength > MAX_AVATAR_BYTES) {
      return NextResponse.json(
        { message: "Avatar payload exceeds 5MB limit" },
        { status: 413 },
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    let response: Response;
    try {
      response = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": rawContentType,
        },
        body: arrayBuffer,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      return NextResponse.json(
        { message: "Storage upload failed" },
        { status: response.status >= 400 && response.status < 600 ? response.status : 502 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { message: "Proxy upload failed" },
      { status: 500 },
    );
  }
}
