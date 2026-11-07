"""
AI Sandbox Runner — Chạy suy luận thật 100% bằng model YOLO (models/best.pt)
trên video do người dùng tải lên từ trang /ai-metrics/test.

Sử dụng trực tiếp các module core trong smart-ppe-ai-service/app/:
- app.detection.detector (Detector, resolve_model_weights)
- app.association.associator (associate)
- app.rules.safety (evaluate)
- app.rules.confirmation (ViolationConfirmation)
- app.rules.deduplication (ViolationDeduplicator)
- app.video.visualizer (draw_detections)
"""

import argparse
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

import cv2

# Đảm bảo import được package app khi gọi trực tiếp bằng python3
_current = Path(__file__).resolve()

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
    cwd_candidate = Path.cwd() / "smart-ppe-ai-service"
    if cwd_candidate.exists():
        return cwd_candidate
    return Path.cwd()

SERVICE_ROOT = find_service_root(_current.parent)
WORKSPACE_ROOT = SERVICE_ROOT.parent

if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app.association.associator import associate
from app.detection.detector import Detector
from app.evidence.snapshot import VIOLATION_LABELS, _draw_violation_overlay
from app.rules.confirmation import ViolationConfirmation
from app.rules.deduplication import ViolationDeduplicator
from app.rules.safety import evaluate as evaluate_safety
from app.video.visualizer import draw_detections


from typing import Optional


def resolve_model_weights(model_identifier: Optional[str] = None) -> str:
    models_dir = SERVICE_ROOT / "models"
    default_pt = models_dir / "best.pt"
    raw = (model_identifier or "models/best.pt").strip()
    candidate = Path(raw)
    if candidate.is_absolute() and candidate.exists():
        return str(candidate)
    rel_candidate = SERVICE_ROOT / candidate
    if rel_candidate.exists():
        return str(rel_candidate)
    file_candidate = models_dir / candidate.name
    if file_candidate.exists():
        return str(file_candidate)
    return str(default_pt)


def write_progress(out_dir: Path, payload: dict) -> None:
    progress_path = out_dir / "progress.json"
    tmp_path = out_dir / "progress.tmp.json"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    tmp_path.replace(progress_path)


def convert_to_h264(video_path: Path) -> None:
    ffmpeg_exe = shutil.which("ffmpeg")
    if not ffmpeg_exe:
        try:
            import imageio_ffmpeg
            ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        except Exception:
            pass
    if not ffmpeg_exe or not video_path.exists():
        return

    tmp_path = video_path.with_name(f"{video_path.stem}_h264.mp4")
    cmd = [
        ffmpeg_exe,
        "-y",
        "-i",
        str(video_path),
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(tmp_path),
    ]
    res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if res.returncode == 0 and tmp_path.exists():
        tmp_path.replace(video_path)


def run_sandbox(
    input_video: Path,
    out_dir: Path,
    job_id: str,
    public_prefix: str,
    model_identifier: str = "models/best.pt",
    conf_threshold: float = 0.35,
    confirm_duration: float = 3.0,
    cooldown_duration: float = 30.0,
    enable_no_helmet: bool = True,
    enable_no_vest: bool = True,
) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    evidence_dir = out_dir / "evidence"
    evidence_dir.mkdir(parents=True, exist_ok=True)

    resolved_model = resolve_model_weights(model_identifier)
    model_rel_name = f"YOLOv11s-PPE ({Path(resolved_model).name})"

    cap = cv2.VideoCapture(str(input_video))
    if not cap.isOpened():
        write_progress(
            out_dir,
            {
                "jobId": job_id,
                "status": "error",
                "error": f"Không thể mở file video: {input_video.name}",
            },
        )
        return

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 1280)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 720)
    raw_fps = float(cap.get(cv2.CAP_PROP_FPS) or 25.0)
    if raw_fps <= 1.0 or raw_fps > 120.0:
        raw_fps = 25.0
    total_frames_est = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)

    # Giới hạn tối đa 600 frames (~20-24s) cho một lần test nhanh để tránh treo lâu nếu người dùng tải video dài hàng giờ
    max_frames = 600
    if total_frames_est > max_frames:
        total_frames_est = max_frames

    write_progress(
        out_dir,
        {
            "jobId": job_id,
            "status": "initializing",
            "progress": 5,
            "currentFrame": 0,
            "totalFrames": total_frames_est,
            "fps": round(raw_fps, 2),
            "size": [width, height],
            "model": model_rel_name,
            "message": f"Đang nạp trọng số {model_rel_name}...",
        },
    )

    # Khởi tạo Detector với ngưỡng tin cậy (giữ conf tối đa 0.65 cho detector để bắt đủ PPE rồi lọc hiển thị)
    effective_conf = max(0.15, min(float(conf_threshold), 0.75))
    detector = Detector(model_path=resolved_model, conf=effective_conf, track=True).load()
    confirmation = ViolationConfirmation(duration_s=max(0.5, float(confirm_duration)))
    dedup = ViolationDeduplicator(cooldown_s=max(1.0, float(cooldown_duration)))

    clean_video_path = out_dir / "clean.mp4"
    annotated_video_path = out_dir / "annotated.mp4"
    log_json_path = out_dir / "log.json"

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    clean_writer = cv2.VideoWriter(str(clean_video_path), fourcc, raw_fps, (width, height))
    annotated_writer = cv2.VideoWriter(str(annotated_video_path), fourcc, raw_fps, (width, height))

    log_entries = []
    prev_ids = set()
    known_classes = {}

    is_vertical = height > width
    viewbox_w = width
    viewbox_h = height
    scale_x = 1.0
    scale_y = 1.0

    frame_idx = 0
    start_wall = time.time()
    confirmed_tracks: set[int] = set()

    while True:
        ret, frame = cap.read()
        if not ret or frame is None:
            break

        frame_idx += 1
        if frame_idx > max_frames:
            break

        t_frame = round((frame_idx - 1) / raw_fps, 3)

        # 1. YOLO Detection + ByteTrack
        detections = detector.detect(frame)

        # 2. PPE-Person Association (VI-04)
        associations = associate(detections)

        # 3. Safety Rule Evaluation (VI-05)
        person_states = evaluate_safety(
            detections,
            associations,
            width,
            height,
            enable_no_helmet=enable_no_helmet,
            enable_no_vest=enable_no_vest,
        )

        # 4. Temporal Confirmation (VI-06)
        confirmations = confirmation.update(t_frame, person_states)

        # 5. Cooldown Deduplication (VI-07)
        violation_events = dedup.filter(confirmations, detections, t_frame)

        for c in confirmations:
            confirmed_tracks.add(c.person_track_id)
        for ev in violation_events:
            confirmed_tracks.add(ev.person_track_id)

        # 6. Vẽ Bounding Box lên frame + Tô đỏ phủ vùng người vi phạm (VI-08)
        vis_frame = frame.copy()
        draw_detections(vis_frame, detections)

        for s in person_states:
            if s.violations:
                person_det = next(
                    (
                        d
                        for d in detections
                        if d.class_name == "person" and d.track_id == s.person_track_id
                    ),
                    None,
                )
                if person_det is not None:
                    v_labels = [
                        VIOLATION_LABELS.get(v, f"VI PHAM: {v.upper()}")
                        for v in s.violations
                    ]
                    combined_label = f"#{s.person_track_id} " + " + ".join(v_labels)
                    _draw_violation_overlay(vis_frame, person_det.bbox, combined_label)
            else:
                confirmed_tracks.discard(s.person_track_id)

        clean_writer.write(frame)
        annotated_writer.write(vis_frame)

        evidence_records = []
        ev_path_by_id = {}
        for ev in violation_events:
            ev_filename = f"evidence_{ev.event_id[:8]}_f{frame_idx}.jpg"
            ev_path = evidence_dir / ev_filename
            cv2.imwrite(str(ev_path), vis_frame)
            rel_ev_url = f"{public_prefix}/evidence/{ev_filename}"
            ev_path_by_id[ev.event_id] = rel_ev_url
            evidence_records.append(
                {
                    "event_id": ev.event_id,
                    "status": "saved",
                    "path": rel_ev_url,
                    "frame": frame_idx,
                }
            )

        ids = {d.track_id for d in detections if d.track_id is not None}
        current_classes = {
            d.track_id: d.class_name for d in detections if d.track_id is not None
        }
        events = [
            f"{current_classes.get(tid, 'đối tượng')} #{tid} xuất hiện"
            for tid in sorted(ids - prev_ids)
        ]
        events += [
            f"{known_classes.get(tid, 'đối tượng')} #{tid} rời khung hình"
            for tid in sorted(prev_ids - ids)
        ]
        known_classes.update(current_classes)
        prev_ids = ids

        counts = {"person": 0, "helmet": 0, "safety_vest": 0}
        for d in detections:
            counts[d.class_name] = counts.get(d.class_name, 0) + 1

        entry = {
            "frame": frame_idx,
            "t": t_frame,
            "detections": [
                {
                    "class_name": d.class_name,
                    "track_id": d.track_id or 1,
                    "confidence": round(d.confidence, 3),
                    "raw_bbox": list(d.bbox),
                    "bbox": [
                        round(d.bbox[0] * scale_x),
                        round(d.bbox[1] * scale_y),
                        round(d.bbox[2] * scale_x),
                        round(d.bbox[3] * scale_y),
                    ],
                    "w": round((d.bbox[2] - d.bbox[0]) * scale_x),
                    "h": round((d.bbox[3] - d.bbox[1]) * scale_y),
                }
                for d in detections
            ],
            "summary": {**counts, "tracks": len(ids)},
            "events": events,
            "associations": [
                {
                    "person": a.person_track_id,
                    "helmet": a.helmet_track_id,
                    "vest": a.vest_track_id,
                    "status": a.status,
                }
                for a in associations
            ],
            "persons": [
                {
                    "track_id": s.person_track_id,
                    "status": (
                        "CONFIRMED_VIOLATION"
                        if (s.violations and s.person_track_id in confirmed_tracks)
                        else s.status
                    ),
                    "violations": s.violations,
                    "reason": s.reason,
                }
                for s in person_states
            ],
            "confirmations": [
                {
                    "person": c.person_track_id,
                    "violation_type": c.violation_type,
                    "start_t": c.start_t,
                    "confirmed_t": c.confirmed_t,
                    "duration_s": c.duration_s,
                }
                for c in confirmations
            ],
            "violations": [
                {
                    "event_id": ev.event_id,
                    "camera_id": "AI-SANDBOX",
                    "person": ev.person_track_id,
                    "canonical_person": ev.canonical_person_id,
                    "violation_type": ev.violation_type,
                    "start_t": ev.start_t,
                    "confirmed_t": ev.confirmed_t,
                    "duration_s": ev.duration_s,
                    "frame": frame_idx,
                    "evidence_path": ev_path_by_id.get(ev.event_id),
                }
                for ev in violation_events
            ],
            "evidence": evidence_records,
        }
        log_entries.append(entry)

        if frame_idx % 10 == 0 or frame_idx == total_frames_est:
            denom = max(total_frames_est, frame_idx, 1)
            pct = min(92, max(8, int((frame_idx / denom) * 88) + 5))
            write_progress(
                out_dir,
                {
                    "jobId": job_id,
                    "status": "processing",
                    "progress": pct,
                    "currentFrame": frame_idx,
                    "totalFrames": max(total_frames_est, frame_idx),
                    "fps": round(raw_fps, 2),
                    "size": [width, height],
                    "model": model_rel_name,
                    "message": f"Đang quét frame {frame_idx}/{max(total_frames_est, frame_idx)} bằng {model_rel_name}...",
                },
            )

    cap.release()
    clean_writer.release()
    annotated_writer.release()

    write_progress(
        out_dir,
        {
            "jobId": job_id,
            "status": "encoding",
            "progress": 95,
            "currentFrame": len(log_entries),
            "totalFrames": len(log_entries),
            "fps": round(raw_fps, 2),
            "size": [width, height],
            "model": model_rel_name,
            "message": "Đang đóng gói video chuẩn H.264 & xuất nhật ký AI...",
        },
    )

    convert_to_h264(clean_video_path)
    convert_to_h264(annotated_video_path)

    elapsed_wall = round(time.time() - start_wall, 2)
    meta = {
        "job_id": job_id,
        "source": input_video.name,
        "fps": round(raw_fps, 2),
        "size": [width, height],
        "viewBox": [viewbox_w, viewbox_h],
        "isVertical": is_vertical,
        "total_frames": len(log_entries),
        "model": model_rel_name,
        "model_path": model_identifier,
        "conf_threshold": conf_threshold,
        "confirmation_duration_s": confirm_duration,
        "cooldown_duration_s": cooldown_duration,
        "enable_no_helmet": enable_no_helmet,
        "enable_no_vest": enable_no_vest,
        "processing_time_s": elapsed_wall,
        "clean_video_url": f"{public_prefix}/clean.mp4",
        "annotated_video_url": f"{public_prefix}/annotated.mp4",
        "log_url": f"{public_prefix}/log.json",
    }

    with open(log_json_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "meta": meta,
                "frames": log_entries,
            },
            f,
            ensure_ascii=False,
        )

    write_progress(
        out_dir,
        {
            "jobId": job_id,
            "status": "completed",
            "progress": 100,
            "currentFrame": len(log_entries),
            "totalFrames": len(log_entries),
            "fps": round(raw_fps, 2),
            "size": [width, height],
            "isVertical": is_vertical,
            "model": model_rel_name,
            "cleanVideoUrl": f"{public_prefix}/clean.mp4",
            "annotatedVideoUrl": f"{public_prefix}/annotated.mp4",
            "logUrl": f"{public_prefix}/log.json",
            "meta": meta,
            "message": f"Hoàn tất phân tích {len(log_entries)} frames trong {elapsed_wall}s!",
        },
    )


def parse_args():
    parser = argparse.ArgumentParser(description="Smart PPE AI Sandbox Video Runner")
    parser.add_argument("--input", required=True, help="Path to input video file")
    parser.add_argument("--out-dir", required=True, help="Output directory path")
    parser.add_argument("--job-id", required=True, help="Sandbox job ID")
    parser.add_argument("--public-prefix", required=True, help="Public URL prefix for assets")
    parser.add_argument("--model", default="models/best.pt", help="Model path or identifier")
    parser.add_argument("--conf", type=float, default=0.35, help="Confidence threshold")
    parser.add_argument("--confirm-duration", type=float, default=3.0, help="Confirmation duration (s)")
    parser.add_argument("--cooldown", type=float, default=30.0, help="Cooldown duration (s)")
    parser.add_argument("--enable-no-helmet", default="true", help="Enable no_helmet rule")
    parser.add_argument("--enable-no-vest", default="true", help="Enable no_safety_vest rule")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    try:
        run_sandbox(
            input_video=Path(args.input),
            out_dir=Path(args.out_dir),
            job_id=args.job_id,
            public_prefix=args.public_prefix,
            model_identifier=args.model,
            conf_threshold=args.conf,
            confirm_duration=args.confirm_duration,
            cooldown_duration=args.cooldown,
            enable_no_helmet=str(args.enable_no_helmet).lower() in ("true", "1", "yes"),
            enable_no_vest=str(args.enable_no_vest).lower() in ("true", "1", "yes"),
        )
    except Exception as exc:
        write_progress(
            Path(args.out_dir),
            {
                "jobId": args.job_id,
                "status": "error",
                "error": str(exc),
            },
        )
        raise
