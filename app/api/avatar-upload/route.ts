import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest) {
  try {
    const uploadUrl = req.headers.get("x-upload-url");
    const contentType = req.headers.get("content-type") || "image/jpeg";

    if (!uploadUrl) {
      return NextResponse.json(
        { message: "Missing x-upload-url header" },
        { status: 400 },
      );
    }

    // Đọc binary body
    const arrayBuffer = await req.arrayBuffer();

    // Gửi PUT từ server Next.js đến Cloudflare R2 (Server-to-Server, không bị chặn CORS)
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
      body: arrayBuffer,
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { message: `R2 upload failed: ${errText}` },
        { status: response.status },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Proxy upload failed" },
      { status: 500 },
    );
  }
}
