import { NextRequest, NextResponse } from "next/server";
import { buildAiUpstreamHeaders, resolveAiEngineUrl } from "@/lib/ai-proxy";

const AI_LIVE_CONFIG_PATH = "/api/live/config";

/**
 * Proxy GET /api/live/config tới AI Engine.
 * Khi chạy chế độ Test-UI Sandbox (`test-ui/server.py`), endpoint `/api/live/config`
 * không tồn tại và trả về 404. Route handler này chuyển 404 thành `200 OK` kèm
 * `{ supported: false }` để trình duyệt không log lỗi đỏ `GET /api/live/config 404`
 * trên DevTools Console, trong khi client vẫn nhận diện đúng chế độ Sandbox.
 */
export async function GET(req: NextRequest) {
  try {
    const upstream = await fetch(resolveAiEngineUrl(AI_LIVE_CONFIG_PATH), {
      method: "GET",
      headers: buildAiUpstreamHeaders(req),
      cache: "no-store",
    });

    if (upstream.status === 404) {
      return NextResponse.json({ supported: false }, { status: 200 });
    }

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") || "application/json",
      },
    });
  } catch {
    return NextResponse.json({ supported: false }, { status: 200 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.text();
    const upstream = await fetch(resolveAiEngineUrl(AI_LIVE_CONFIG_PATH), {
      method: "PATCH",
      headers: buildAiUpstreamHeaders(req),
      body,
      cache: "no-store",
    });

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") || "application/json",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        detail:
          error instanceof Error
            ? error.message
            : "AI Engine connection failed",
      },
      { status: 502 },
    );
  }
}

