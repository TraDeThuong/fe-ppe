import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cameraId = searchParams.get("cameraId")?.trim();

    if (!cameraId) {
      return NextResponse.json(
        { success: false, message: "Thiếu tham số cameraId." },
        { status: 400 }
      );
    }

    const safeId = cameraId.replace(/[^a-zA-Z0-9_-]/g, "");
    const shortId = safeId.slice(0, 8);
    const feRoot = process.cwd();
    const dataDir = path.join(feRoot, "public", "data");

    // 1. Tìm file log khớp (full ID hoặc 8 ký tự đầu)
    let foundLogFile: string | null = null;
    for (const id of [safeId, shortId]) {
      const p = path.join(dataDir, `camera-${id}-log.json`);
      try {
        await fs.access(p);
        foundLogFile = `camera-${id}-log.json`;
        break;
      } catch {}
    }

    if (foundLogFile) {
      const idMatch = foundLogFile.replace(/^camera-/, "").replace(/-log\.json$/, "");
      return NextResponse.json({
        success: true,
        data: {
          cameraId: safeId,
          status: "completed",
          progress: 100,
          logUrl: `/data/${foundLogFile}`,
          videoUrl: `/videos/cameras/camera-${idMatch}.mp4`,
          annotatedVideoUrl: `/videos/cameras/camera-${idMatch}-annotated.mp4`,
          message: "Đã có dữ liệu bám vết YOLOv11 sẵn sàng.",
        },
      });
    }

    // 2. Kiểm tra tiến trình đang chạy
    const progressPath = path.join(
      feRoot,
      "public",
      "videos",
      "cameras",
      `job_${safeId}`,
      "progress.json"
    );

    try {
      const raw = await fs.readFile(progressPath, "utf-8");
      const parsed = JSON.parse(raw);
      return NextResponse.json({
        success: true,
        data: parsed,
      });
    } catch {
      return NextResponse.json({
        success: true,
        data: {
          cameraId: safeId,
          status: "idle",
          progress: 0,
          message: "Chưa phân tích video bằng mô hình AI.",
        },
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Lỗi kiểm tra trạng thái phân tích AI." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cameraId = (body.cameraId as string)?.trim();
    const streamUrl = (body.streamUrl as string)?.trim();

    if (!cameraId || !streamUrl) {
      return NextResponse.json(
        { success: false, message: "Vui lòng cung cấp cameraId và streamUrl." },
        { status: 400 }
      );
    }

    const safeId = cameraId.replace(/[^a-zA-Z0-9_-]/g, "");
    const feRoot = process.cwd();
    const workspaceRoot = path.resolve(feRoot, "..");
    const logPath = path.join(feRoot, "public", "data", `camera-${safeId}-log.json`);

    // Nếu đã hoàn tất rồi
    for (const id of [safeId, safeId.slice(0, 8)]) {
      const p = path.join(feRoot, "public", "data", `camera-${id}-log.json`);
      try {
        await fs.access(p);
        return NextResponse.json({
          success: true,
          data: {
            cameraId: safeId,
            status: "completed",
            progress: 100,
            logUrl: `/data/camera-${id}-log.json`,
            videoUrl: `/videos/cameras/camera-${id}.mp4`,
            message: "Video đã được phân tích bám vết trước đó.",
          },
        });
      } catch {}
    }

    const jobDir = path.join(feRoot, "public", "videos", "cameras", `job_${safeId}`);
    await fs.mkdir(jobDir, { recursive: true });

    // Kiểm tra nếu đang chạy thì không spawn lặp lại
    const progressPath = path.join(jobDir, "progress.json");
    try {
      const existingRaw = await fs.readFile(progressPath, "utf-8");
      const existing = JSON.parse(existingRaw);
      if (existing?.status === "processing" || existing?.status === "downloading") {
        return NextResponse.json({
          success: true,
          data: existing,
        });
      }
    } catch {
      // Không có tiến trình cũ
    }

    const initialProgress = {
      jobId: `auto_${safeId}`,
      cameraId: safeId,
      status: "initializing",
      progress: 5,
      message: "Đang khởi tạo tiến trình suy luận tự động bằng mô hình YOLOv11...",
    };

    await fs.writeFile(progressPath, JSON.stringify(initialProgress, null, 2), "utf-8");

    const runnerScript = path.join(feRoot, "scripts", "auto_analyze_camera.py");
    const child = spawn(
      "/usr/bin/python3",
      [
        runnerScript,
        "--camera-id",
        safeId,
        "--stream-url",
        streamUrl,
        "--model",
        body.modelPath || "models/best.pt",
        "--conf",
        String(body.confidenceThreshold || "0.35"),
        "--confirm-duration",
        String(body.confirmationDuration || "3.0"),
        "--cooldown",
        String(body.cooldownDuration || "30.0"),
        "--enable-no-helmet",
        String(body.enableNoHelmet ?? "true"),
        "--enable-no-vest",
        String(body.enableNoVest ?? "true"),
      ],
      {
        cwd: path.join(workspaceRoot, "smart-ppe-ai-service"),
        detached: true,
        stdio: "ignore",
      }
    );
    child.unref();

    return NextResponse.json({
      success: true,
      data: initialProgress,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Lỗi khi kích hoạt phân tích video camera.",
      },
      { status: 500 }
    );
  }
}
