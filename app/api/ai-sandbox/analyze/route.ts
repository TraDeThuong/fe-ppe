import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get("video") as File | null;
    const existingJobId = (formData.get("existingJobId") as string | null)?.trim();

    const modelPath = ((formData.get("modelPath") as string) || "models/best.pt").trim();
    const confidenceThreshold = (formData.get("confidenceThreshold") as string) || "0.35";
    const confirmationDuration = (formData.get("confirmationDuration") as string) || "3.0";
    const cooldownDuration = (formData.get("cooldownDuration") as string) || "30.0";
    const enableNoHelmet = (formData.get("enableNoHelmet") as string) || "true";
    const enableNoVest = (formData.get("enableNoVest") as string) || "true";

    const feRoot = process.cwd();
    const workspaceRoot = path.resolve(feRoot, "..");
    const sandboxBaseDir = path.join(feRoot, "public", "videos", "sandbox");
    await fs.mkdir(sandboxBaseDir, { recursive: true });

    const jobId = `sb_${Date.now()}`;
    const outDir = path.join(sandboxBaseDir, jobId);
    await fs.mkdir(outDir, { recursive: true });

    let inputVideoPath = "";
    let originalName = "uploaded_video.mp4";

    if (videoFile && videoFile.size > 0) {
      const ext = path.extname(videoFile.name || ".mp4") || ".mp4";
      const safeStem = (path.basename(videoFile.name || "video", ext) || "video")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 48);
      originalName = `${safeStem}${ext}`;
      inputVideoPath = path.join(outDir, originalName);
      const arrayBuffer = await videoFile.arrayBuffer();
      await fs.writeFile(inputVideoPath, Buffer.from(arrayBuffer));
    } else if (existingJobId) {
      const prevDir = path.join(sandboxBaseDir, existingJobId.replace(/[^a-zA-Z0-9_-]/g, ""));
      const prevClean = path.join(prevDir, "clean.mp4");
      try {
        await fs.access(prevClean);
        originalName = "reanalyzed_video.mp4";
        inputVideoPath = path.join(outDir, originalName);
        await fs.copyFile(prevClean, inputVideoPath);
      } catch {
        return NextResponse.json(
          { success: false, message: "Không tìm thấy video gốc để phân tích lại." },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, message: "Vui lòng chọn một file video (.mp4, .mov, .webm) để tải lên." },
        { status: 400 }
      );
    }

    const publicPrefix = `/videos/sandbox/${jobId}`;
    const initialProgress = {
      jobId,
      status: "initializing",
      progress: 2,
      currentFrame: 0,
      totalFrames: 0,
      source: originalName,
      model: modelPath,
      message: "Đang khởi tạo tiến trình suy luận AI (models/best.pt)...",
    };

    await fs.writeFile(
      path.join(outDir, "progress.json"),
      JSON.stringify(initialProgress, null, 2),
      "utf-8"
    );

    const runnerScript = path.join(
      feRoot,
      "scripts",
      "sandbox_runner.py"
    );

    const child = spawn(
      "/usr/bin/python3",
      [
        runnerScript,
        "--input",
        inputVideoPath,
        "--out-dir",
        outDir,
        "--job-id",
        jobId,
        "--public-prefix",
        publicPrefix,
        "--model",
        modelPath,
        "--conf",
        String(confidenceThreshold),
        "--confirm-duration",
        String(confirmationDuration),
        "--cooldown",
        String(cooldownDuration),
        "--enable-no-helmet",
        String(enableNoHelmet),
        "--enable-no-vest",
        String(enableNoVest),
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
        message: err?.message || "Lỗi khi khởi chạy phân tích video AI.",
      },
      { status: 500 }
    );
  }
}

