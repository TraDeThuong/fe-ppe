import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId")?.trim();
    const feRoot = process.cwd();
    const sandboxBaseDir = path.join(feRoot, "public", "videos", "sandbox");

    if (jobId) {
      const safeJobId = jobId.replace(/[^a-zA-Z0-9_-]/g, "");
      const progressPath = path.join(sandboxBaseDir, safeJobId, "progress.json");
      try {
        const raw = await fs.readFile(progressPath, "utf-8");
        const parsed = JSON.parse(raw);
        return NextResponse.json({
          success: true,
          data: parsed,
        });
      } catch {
        return NextResponse.json(
          { success: false, message: "Không tìm thấy tiến trình phân tích AI." },
          { status: 404 }
        );
      }
    }

    // Nếu không truyền jobId -> Trả về danh sách các job đã chạy gần đây
    try {
      await fs.access(sandboxBaseDir);
    } catch {
      return NextResponse.json({ success: true, data: [] });
    }

    const entries = await fs.readdir(sandboxBaseDir, { withFileTypes: true });
    const jobs: any[] = [];

    for (const dirent of entries) {
      if (!dirent.isDirectory()) continue;
      const pPath = path.join(sandboxBaseDir, dirent.name, "progress.json");
      try {
        const raw = await fs.readFile(pPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed && parsed.status === "completed") {
          jobs.push({
            job_id: parsed.jobId || dirent.name,
            source: parsed.meta?.source || parsed.source || dirent.name,
            total_frames: parsed.totalFrames || parsed.meta?.total_frames || 0,
            fps: parsed.fps || parsed.meta?.fps || 25,
            model: parsed.model || parsed.meta?.model || "YOLOv11s-PPE (best.pt)",
            cleanVideoUrl: parsed.cleanVideoUrl,
            annotatedVideoUrl: parsed.annotatedVideoUrl,
            logUrl: parsed.logUrl,
            meta: parsed.meta,
          });
        }
      } catch {
        // ignore incomplete dir
      }
    }

    jobs.sort((a, b) => String(b.job_id).localeCompare(String(a.job_id)));
    return NextResponse.json({
      success: true,
      data: jobs.slice(0, 15),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Lỗi truy vấn trạng thái AI Sandbox." },
      { status: 500 }
    );
  }
}

