"""
auto_analyze_camera.py
Tự động tải video từ YouTube hoặc URL ngoài, chạy suy luận YOLOv11 + ByteTrack thật 100%,
và xuất file log JSON cùng video vào fe-ppe/public để camera mới chạy chuẩn xác ngay lập tức.
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

# Đảm bảo import được các module từ smart-ppe-ai-service và fe-ppe/scripts
CURRENT_FILE = Path(__file__).resolve()

def find_fe_root(start_dir: Path) -> Path:
    p = start_dir.resolve()
    for _ in range(6):
        if (p / "public").exists() and (p / "package.json").exists():
            return p
        if (p / "fe-ppe").exists():
            return p / "fe-ppe"
        if p.parent == p:
            break
        p = p.parent
    return Path.cwd()

def find_service_root(start_dir: Path) -> Path:
    p = start_dir.resolve()
    for _ in range(6):
        candidate = p / "smart-ppe-ai-service"
        if candidate.exists() and (candidate / "app").exists():
            return candidate
        if (p / "app").exists() and (p / "models").exists():
            return p
        if p.parent == p:
            break
        p = p.parent
    return Path.cwd()

FE_ROOT = find_fe_root(CURRENT_FILE.parent)
SERVICE_ROOT = find_service_root(CURRENT_FILE.parent)
WORKSPACE_ROOT = SERVICE_ROOT.parent

if str(CURRENT_FILE.parent) not in sys.path:
    sys.path.insert(0, str(CURRENT_FILE.parent))
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from sandbox_runner import run_sandbox, write_progress, convert_to_h264


def download_youtube_video(url: str, out_raw: Path) -> bool:
    """Tải video YouTube bằng yt-dlp nếu có sẵn trên máy."""
    yt_dlp_bin = shutil.which("yt-dlp")
    if not yt_dlp_bin:
        # Kiểm tra Homebrew Mac thông dụng
        for candidate in ["/opt/homebrew/bin/yt-dlp", "/usr/local/bin/yt-dlp"]:
            if os.path.exists(candidate):
                yt_dlp_bin = candidate
                break

    if not yt_dlp_bin:
        print("[ERROR] Không tìm thấy yt-dlp trên hệ thống để tải YouTube.", file=sys.stderr)
        return False

    out_raw.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        yt_dlp_bin,
        "--extractor-args", "youtube:player_client=android,web",
        "-f", "18/136/137/bestvideo[ext=mp4]/best",
        "--no-playlist",
        "--max-filesize", "100M",
        "-o", str(out_raw),
        url,
    ]
    print(f"[INFO] Bắt đầu tải video từ YouTube: {url}")
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        print(f"[WARN] yt-dlp trả về mã lỗi: {res.stderr}")
        return False
    return out_raw.exists() and out_raw.stat().st_size > 1000


def auto_analyze(
    camera_id: str,
    stream_url: str,
    model_path: str = "models/best.pt",
    conf_threshold: float = 0.35,
    confirm_duration: float = 3.0,
    cooldown_duration: float = 30.0,
    enable_no_helmet: bool = True,
    enable_no_vest: bool = True,
) -> None:
    safe_cam_id = re.sub(r"[^a-zA-Z0-9_-]", "", str(camera_id))
    jobs_base = FE_ROOT / "public" / "videos" / "cameras"
    job_dir = jobs_base / f"job_{safe_cam_id}"
    job_dir.mkdir(parents=True, exist_ok=True)

    progress_file = job_dir / "progress.json"
    raw_video = job_dir / "raw.mp4"

    write_progress(
        job_dir,
        {
            "jobId": f"auto_{safe_cam_id}",
            "cameraId": safe_cam_id,
            "status": "initializing",
            "progress": 5,
            "message": "Đang chuẩn bị nguồn video để phân tích AI...",
        },
    )

    clean_url = stream_url.strip()
    is_youtube = "youtube.com" in clean_url or "youtu.be" in clean_url

    # 1. Thu nạp video nguồn
    if is_youtube:
        write_progress(
            job_dir,
            {
                "jobId": f"auto_{safe_cam_id}",
                "cameraId": safe_cam_id,
                "status": "downloading",
                "progress": 10,
                "message": "Đang tải video công trường từ YouTube...",
            },
        )
        ok = download_youtube_video(clean_url, raw_video)
        if not ok:
            write_progress(
                job_dir,
                {
                    "jobId": f"auto_{safe_cam_id}",
                    "cameraId": safe_cam_id,
                    "status": "error",
                    "error": "Không thể tải video từ YouTube. Vui lòng kiểm tra lại link.",
                },
            )
            return
    elif clean_url.startswith("/videos/"):
        local_path = FE_ROOT / "public" / clean_url.lstrip("/")
        if local_path.exists():
            shutil.copyfile(local_path, raw_video)
        else:
            write_progress(
                job_dir,
                {
                    "jobId": f"auto_{safe_cam_id}",
                    "cameraId": safe_cam_id,
                    "status": "error",
                    "error": f"Không tìm thấy file video nội bộ: {clean_url}",
                },
            )
            return
    elif clean_url.startswith("http://") or clean_url.startswith("https://"):
        import urllib.request
        try:
            write_progress(
                job_dir,
                {
                    "jobId": f"auto_{safe_cam_id}",
                    "cameraId": safe_cam_id,
                    "status": "downloading",
                    "progress": 10,
                    "message": "Đang tải video từ đường dẫn từ xa...",
                },
            )
            urllib.request.urlretrieve(clean_url, raw_video)
        except Exception as e:
            write_progress(
                job_dir,
                {
                    "jobId": f"auto_{safe_cam_id}",
                    "cameraId": safe_cam_id,
                    "status": "error",
                    "error": f"Lỗi tải video từ xa: {e}",
                },
            )
            return
    elif (FE_ROOT / "public" / clean_url.lstrip("/")).exists():
        local_cand = FE_ROOT / "public" / clean_url.lstrip("/")
        shutil.copyfile(local_cand, raw_video)
    elif Path(clean_url).exists():
        shutil.copyfile(Path(clean_url), raw_video)
    else:
        write_progress(
            job_dir,
            {
                "jobId": f"auto_{safe_cam_id}",
                "cameraId": safe_cam_id,
                "status": "error",
                "error": f"Nguồn stream không tìm thấy hoặc không hỗ trợ: {clean_url}",
            },
        )
        return

    # 2. Chạy suy luận qua sandbox_runner
    write_progress(
        job_dir,
        {
            "jobId": f"auto_{safe_cam_id}",
            "cameraId": safe_cam_id,
            "status": "processing",
            "progress": 15,
            "message": "Bắt đầu quét đối tượng và bám vết bảo hộ lao động bằng YOLOv11...",
        },
    )

    try:
        run_sandbox(
            input_video=raw_video,
            out_dir=job_dir,
            job_id=f"auto_{safe_cam_id}",
            public_prefix=f"/videos/cameras/job_{safe_cam_id}",
            model_identifier=model_path,
            conf_threshold=conf_threshold,
            confirm_duration=confirm_duration,
            cooldown_duration=cooldown_duration,
            enable_no_helmet=enable_no_helmet,
            enable_no_vest=enable_no_vest,
        )

        # 3. Sao chép kết quả thành file chuẩn cho Camera ID
        target_video = jobs_base / f"camera-{safe_cam_id}.mp4"
        target_annotated = jobs_base / f"camera-{safe_cam_id}-annotated.mp4"
        target_log = FE_ROOT / "public" / "data" / f"camera-{safe_cam_id}-log.json"

        if (job_dir / "clean.mp4").exists():
            shutil.copyfile(job_dir / "clean.mp4", target_video)
        if (job_dir / "annotated.mp4").exists():
            shutil.copyfile(job_dir / "annotated.mp4", target_annotated)
        if (job_dir / "log.json").exists():
            shutil.copyfile(job_dir / "log.json", target_log)

        # Sao chép evidence nếu có
        evidence_src = job_dir / "evidence"
        if evidence_src.exists():
            evidence_dest = jobs_base / "evidence"
            evidence_dest.mkdir(parents=True, exist_ok=True)
            for item in evidence_src.iterdir():
                if item.is_file():
                    shutil.copyfile(item, evidence_dest / item.name)

        write_progress(
            job_dir,
            {
                "jobId": f"auto_{safe_cam_id}",
                "cameraId": safe_cam_id,
                "status": "completed",
                "progress": 100,
                "videoUrl": f"/videos/cameras/camera-{safe_cam_id}.mp4",
                "logUrl": f"/data/camera-{safe_cam_id}-log.json",
                "message": "Hoàn tất phân tích bám vết AI tự động thành công!",
            },
        )
        print(f"[SUCCESS] Phân tích hoàn tất cho camera {safe_cam_id}!")
    except Exception as e:
        write_progress(
            job_dir,
            {
                "jobId": f"auto_{safe_cam_id}",
                "cameraId": safe_cam_id,
                "status": "error",
                "error": f"Lỗi trong quá trình chạy YOLOv11: {e}",
            },
        )
        print(f"[ERROR] Thất bại khi phân tích camera {safe_cam_id}: {e}", file=sys.stderr)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Tự động phân tích video camera bằng YOLOv11")
    parser.add_argument("--camera-id", required=True)
    parser.add_argument("--stream-url", required=True)
    parser.add_argument("--model", default="models/best.pt")
    parser.add_argument("--conf", type=float, default=0.35)
    parser.add_argument("--confirm-duration", type=float, default=3.0)
    parser.add_argument("--cooldown", type=float, default=30.0)
    parser.add_argument("--enable-no-helmet", default="true")
    parser.add_argument("--enable-no-vest", default="true")

    args = parser.parse_args()
    auto_analyze(
        camera_id=args.camera_id,
        stream_url=args.stream_url,
        model_path=args.model,
        conf_threshold=args.conf,
        confirm_duration=args.confirm_duration,
        cooldown_duration=args.cooldown,
        enable_no_helmet=str(args.enable_no_helmet).lower() in ("true", "1", "yes"),
        enable_no_vest=str(args.enable_no_vest).lower() in ("true", "1", "yes"),
    )
