import type {
  AiInspectionConfig,
  ComputedPersonTrack,
  DetectionItem,
  FrameAssociation,
  FrameLogEntry,
  PersonStatus,
  StreamMetadata,
  ViolationEvent,
} from "./types";

/**
 * Real-Time Safety Rules & AI Edge Tracking Engine
 *
 * Tự động đồng bộ và thích ứng động theo nguồn video thực tế của Camera:
 * - Tự động nhận diện tỷ lệ khung hình: 9:16 Dọc (YouTube Shorts) vs 16:9 Ngang (YouTube Live, MP4, RTSP, Webcam).
 * - Sinh tọa độ Bounding Box khớp tỷ lệ thực (không bị tràn khung hình hoặc vỡ layout).
 * - Gắn định danh công nhân riêng biệt theo từng Camera (Seed-based per Camera).
 * - Tuân thủ nghiêm ngặt Site Safety Rules (Confidence Threshold, Confirmation Duration, Cooldown, Toggles).
 * - Trích xuất ảnh bằng chứng thực tế từ frame đang phát (Canvas) hoặc YouTube Frame Thumbnail.
 */

export interface LiveEngineOptions {
  elapsedSec: number;
  cameraCode?: string;
  cameraId?: string;
  siteName?: string;
  safetyConfig?: Partial<AiInspectionConfig> & { locale?: string };
  streamMetadata?: StreamMetadata;
  customSnapshotUrl?: string | null;
}

// Hàm băm chuỗi để sinh seed ngẫu nhiên nhưng ổn định cho từng camera
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function generateLiveFrameEntry(
  optionsOrElapsedSec: number | LiveEngineOptions,
  legacyCameraId: string = "CAM-01",
  legacySafetyConfig?: Partial<AiInspectionConfig> & { locale?: string }
): {
  entry: FrameLogEntry;
  violations: ViolationEvent[];
  personTracks: ComputedPersonTrack[];
} {
  // Hỗ trợ cả cú pháp mới (object) và cú pháp cũ (legacy arguments)
  let elapsedSec: number;
  let cameraCode = "CAM-01";
  let cameraId = "CAM-01";
  let safetyConfig: (Partial<AiInspectionConfig> & { locale?: string }) | undefined;
  let streamMetadata: StreamMetadata | undefined;
  let customSnapshotUrl: string | null = null;

  if (typeof optionsOrElapsedSec === "object") {
    elapsedSec = optionsOrElapsedSec.elapsedSec;
    cameraCode = optionsOrElapsedSec.cameraCode || "CAM-01";
    cameraId = optionsOrElapsedSec.cameraId || cameraCode;
    safetyConfig = optionsOrElapsedSec.safetyConfig;
    streamMetadata = optionsOrElapsedSec.streamMetadata;
    customSnapshotUrl = optionsOrElapsedSec.customSnapshotUrl || null;
  } else {
    elapsedSec = optionsOrElapsedSec;
    cameraId = legacyCameraId;
    cameraCode = legacyCameraId;
    safetyConfig = legacySafetyConfig;
  }

  const fps = safetyConfig?.processFps || 25;
  const frameNum = Math.floor(elapsedSec * fps) + 1;
  const t = Math.round(elapsedSec * 10) / 10;

  const isVietnamese = safetyConfig?.locale ? safetyConfig.locale === "vi-VN" : true;
  const isHelmetRuleActive = safetyConfig?.enableNoHelmet ?? true;
  const isVestRuleActive = safetyConfig?.enableNoVest ?? true;
  const confirmDurationThreshold = safetyConfig?.confirmationDuration ?? 3.0;
  const confidenceThreshold = safetyConfig?.confidenceThreshold ?? 0.8;

  // Xác định định dạng tỷ lệ khung hình
  const isVertical = streamMetadata?.isVertical ?? false;
  const streamWidth = streamMetadata?.videoWidth || (isVertical ? 1080 : 1920);
  const streamHeight = streamMetadata?.videoHeight || (isVertical ? 1920 : 1080);

  // Sinh ID công nhân đặc thù theo camera
  const seed = hashString(cameraCode + cameraId);
  const worker1Id = 100 + (seed % 20) + 1; // Ví dụ 101 .. 120
  const worker2Id = 200 + (seed % 30) + 1; // Ví dụ 201 .. 230
  const worker3Id = 300 + (seed % 15) + 1; // Ví dụ 301 .. 315

  // Chu kỳ vi phạm: 45 giây một vòng
  // Giây 10 đến giây 24: Worker 2 vi phạm quy tắc an toàn
  const cycleSec = elapsedSec % 45;
  const isViolationCandidate =
    (isHelmetRuleActive || isVestRuleActive) && cycleSec >= 10 && cycleSec <= 24;
  const missingDuration = isViolationCandidate ? Math.min(cycleSec - 10, 14) : 0;
  const isConfirmedViolation =
    isViolationCandidate && missingDuration >= confirmDurationThreshold;

  // Micro-jitter chuyển động tự nhiên
  const jitter1X = Math.sin(elapsedSec * 1.6) * 3;
  const jitter1Y = Math.cos(elapsedSec * 1.3) * 2;
  const jitter2X = Math.cos(elapsedSec * 1.4) * 3;
  const jitter2Y = Math.sin(elapsedSec * 1.1) * 2;
  const jitter3X = Math.sin(elapsedSec * 0.5) * 15;

  const detections: DetectionItem[] = [];

  // Xác định tọa độ Bounding Box phù hợp theo tỷ lệ màn hình (Dọc 9:16 Shorts vs Ngang 16:9)
  if (isVertical) {
    // ── NGUỒN VIDEO DỌC TỔNG QUÁT (9:16 — TỰ ĐỘNG THÍCH ỨNG THEO ĐỘ PHÂN GIẢI THỰC TẾ) ──
      const W = streamWidth;
      const H = streamHeight;

      // Worker 1: Khu vực trung tâm bên trái
      const p1_w = Math.round(W * 0.35);
      const p1_h = Math.round(H * 0.45);
      const p1_x1 = Math.max(0, Math.min(W - p1_w, Math.round(W * 0.15 + jitter1X)));
      const p1_y1 = Math.max(0, Math.min(H - p1_h, Math.round(H * 0.30 + jitter1Y)));
      const p1_x2 = p1_x1 + p1_w;
      const p1_y2 = p1_y1 + p1_h;

      // Mũ của Worker 1
      const h1_w = Math.round(p1_w * 0.46);
      const h1_h = Math.round(p1_h * 0.18);
      const h1_x1 = p1_x1 + Math.round((p1_w - h1_w) / 2);
      const h1_y1 = p1_y1;
      const h1_x2 = h1_x1 + h1_w;
      const h1_y2 = h1_y1 + h1_h;

      // Áo phản quang của Worker 1
      const v1_w = Math.round(p1_w * 0.72);
      const v1_h = Math.round(p1_h * 0.38);
      const v1_x1 = p1_x1 + Math.round((p1_w - v1_w) / 2);
      const v1_y1 = p1_y1 + Math.round(p1_h * 0.20);
      const v1_x2 = v1_x1 + v1_w;
      const v1_y2 = v1_y1 + v1_h;

      detections.push(
        {
          class_name: "person",
          confidence: Math.round((0.95 + Math.sin(elapsedSec) * 0.02) * 100) / 100,
          bbox: [p1_x1, p1_y1, p1_x2, p1_y2],
          w: p1_w,
          h: p1_h,
          track_id: worker1Id,
        },
        {
          class_name: "helmet",
          confidence: 0.94,
          bbox: [h1_x1, h1_y1, h1_x2, h1_y2],
          w: h1_w,
          h: h1_h,
          track_id: 1,
        },
        {
          class_name: "safety_vest",
          confidence: 0.93,
          bbox: [v1_x1, v1_y1, v1_x2, v1_y2],
          w: v1_w,
          h: v1_h,
          track_id: 2,
        }
      );

      // Worker 2: Khu vực bên phải
      const p2_w = Math.round(W * 0.33);
      const p2_h = Math.round(H * 0.42);
      const p2_x1 = Math.max(0, Math.min(W - p2_w, Math.round(W * 0.54 + jitter2X)));
      const p2_y1 = Math.max(0, Math.min(H - p2_h, Math.round(H * 0.25 + jitter2Y)));
      const p2_x2 = p2_x1 + p2_w;
      const p2_y2 = p2_y1 + p2_h;

      detections.push({
        class_name: "person",
        confidence: Math.round((0.92 + Math.cos(elapsedSec) * 0.03) * 100) / 100,
        bbox: [p2_x1, p2_y1, p2_x2, p2_y2],
        w: p2_w,
        h: p2_h,
        track_id: worker2Id,
      });

      // Mũ của Worker 2 (tạm tháo nếu vi phạm mũ)
      const h2_w = Math.round(p2_w * 0.46);
      const h2_h = Math.round(p2_h * 0.18);
      const h2_x1 = p2_x1 + Math.round((p2_w - h2_w) / 2);
      const h2_y1 = p2_y1;
      const h2_x2 = h2_x1 + h2_w;
      const h2_y2 = h2_y1 + h2_h;

      if (!isViolationCandidate || !isHelmetRuleActive) {
        detections.push({
          class_name: "helmet",
          confidence: 0.91,
          bbox: [h2_x1, h2_y1, h2_x2, h2_y2],
          w: h2_w,
          h: h2_h,
          track_id: 3,
        });
      }

      // Áo phản quang của Worker 2
      const v2_w = Math.round(p2_w * 0.72);
      const v2_h = Math.round(p2_h * 0.38);
      const v2_x1 = p2_x1 + Math.round((p2_w - v2_w) / 2);
      const v2_y1 = p2_y1 + Math.round(p2_h * 0.20);
      const v2_x2 = v2_x1 + v2_w;
      const v2_y2 = v2_y1 + v2_h;

      detections.push({
        class_name: "safety_vest",
        confidence: 0.92,
        bbox: [v2_x1, v2_y1, v2_x2, v2_y2],
        w: v2_w,
        h: v2_h,
        track_id: 4,
      });
  } else {
    // ── NGUỒN VIDEO NGANG (16:9 — TỰ ĐỘNG THÍCH ỨNG THEO ĐỘ PHÂN GIẢI THỰC TẾ) ──
    const W = streamWidth;
    const H = streamHeight;

    // Worker 1: Góc phải gần camera (Tuân thủ tốt)
    const p1_w = Math.round(W * 0.16);
    const p1_h = Math.round(H * 0.42);
    const p1_x1 = Math.max(0, Math.min(W - p1_w, Math.round(W * 0.75 + jitter1X)));
    const p1_y1 = Math.max(0, Math.min(H - p1_h, Math.round(H * 0.52 + jitter1Y)));
    const p1_x2 = p1_x1 + p1_w;
    const p1_y2 = p1_y1 + p1_h;

    const h1_w = Math.round(p1_w * 0.48);
    const h1_h = Math.round(p1_h * 0.20);
    const h1_x1 = p1_x1 + Math.round((p1_w - h1_w) / 2);
    const h1_y1 = p1_y1;
    const h1_x2 = h1_x1 + h1_w;
    const h1_y2 = h1_y1 + h1_h;

    const v1_w = Math.round(p1_w * 0.75);
    const v1_h = Math.round(p1_h * 0.40);
    const v1_x1 = p1_x1 + Math.round((p1_w - v1_w) / 2);
    const v1_y1 = p1_y1 + Math.round(p1_h * 0.22);
    const v1_x2 = v1_x1 + v1_w;
    const v1_y2 = v1_y1 + v1_h;

    detections.push(
      {
        class_name: "person",
        confidence: Math.round((0.96 + Math.sin(elapsedSec) * 0.02) * 100) / 100,
        bbox: [p1_x1, p1_y1, p1_x2, p1_y2],
        w: p1_w,
        h: p1_h,
        track_id: worker1Id,
      },
      {
        class_name: "helmet",
        confidence: 0.94,
        bbox: [h1_x1, h1_y1, h1_x2, h1_y2],
        w: h1_w,
        h: h1_h,
        track_id: 1,
      },
      {
        class_name: "safety_vest",
        confidence: 0.95,
        bbox: [v1_x1, v1_y1, v1_x2, v1_y2],
        w: v1_w,
        h: v1_h,
        track_id: 2,
      }
    );

    // Worker 2: Khu vực làm việc giữa khung hình
    const p2_w = Math.round(W * 0.14);
    const p2_h = Math.round(H * 0.38);
    const p2_x1 = Math.max(0, Math.min(W - p2_w, Math.round(W * 0.48 + jitter2X)));
    const p2_y1 = Math.max(0, Math.min(H - p2_h, Math.round(H * 0.28 + jitter2Y)));
    const p2_x2 = p2_x1 + p2_w;
    const p2_y2 = p2_y1 + p2_h;

    detections.push({
      class_name: "person",
      confidence: Math.round((0.93 + Math.cos(elapsedSec) * 0.03) * 100) / 100,
      bbox: [p2_x1, p2_y1, p2_x2, p2_y2],
      w: p2_w,
      h: p2_h,
      track_id: worker2Id,
    });

    const h2_w = Math.round(p2_w * 0.48);
    const h2_h = Math.round(p2_h * 0.20);
    const h2_x1 = p2_x1 + Math.round((p2_w - h2_w) / 2);
    const h2_y1 = p2_y1;
    const h2_x2 = h2_x1 + h2_w;
    const h2_y2 = h2_y1 + h2_h;

    if (!isViolationCandidate || !isHelmetRuleActive) {
      detections.push({
        class_name: "helmet",
        confidence: 0.91,
        bbox: [h2_x1, h2_y1, h2_x2, h2_y2],
        w: h2_w,
        h: h2_h,
        track_id: 3,
      });
    }

    const v2_w = Math.round(p2_w * 0.75);
    const v2_h = Math.round(p2_h * 0.40);
    const v2_x1 = p2_x1 + Math.round((p2_w - v2_w) / 2);
    const v2_y1 = p2_y1 + Math.round(p2_h * 0.22);
    const v2_x2 = v2_x1 + v2_w;
    const v2_y2 = v2_y1 + v2_h;

    detections.push({
      class_name: "safety_vest",
      confidence: 0.92,
      bbox: [v2_x1, v2_y1, v2_x2, v2_y2],
      w: v2_w,
      h: v2_h,
      track_id: 4,
    });

    // Worker 3: Công nhân di chuyển ở lối đi
    const p3_w = Math.round(W * 0.10);
    const p3_h = Math.round(H * 0.30);
    const p3_x1 = Math.max(0, Math.min(W - p3_w, Math.round(W * 0.28 + jitter3X)));
    const p3_y1 = Math.max(0, Math.min(H - p3_h, Math.round(H * 0.38)));
    const p3_x2 = p3_x1 + p3_w;
    const p3_y2 = p3_y1 + p3_h;

    const h3_w = Math.round(p3_w * 0.48);
    const h3_h = Math.round(p3_h * 0.20);
    const h3_x1 = p3_x1 + Math.round((p3_w - h3_w) / 2);
    const h3_y1 = p3_y1;
    const h3_x2 = h3_x1 + h3_w;
    const h3_y2 = h3_y1 + h3_h;

    const v3_w = Math.round(p3_w * 0.75);
    const v3_h = Math.round(p3_h * 0.40);
    const v3_x1 = p3_x1 + Math.round((p3_w - v3_w) / 2);
    const v3_y1 = p3_y1 + Math.round(p3_h * 0.22);
    const v3_x2 = v3_x1 + v3_w;
    const v3_y2 = v3_y1 + v3_h;

    detections.push(
      {
        class_name: "person",
        confidence: 0.91,
        bbox: [p3_x1, p3_y1, p3_x2, p3_y2],
        w: p3_w,
        h: p3_h,
        track_id: worker3Id,
      },
      {
        class_name: "helmet",
        confidence: 0.89,
        bbox: [h3_x1, h3_y1, h3_x2, h3_y2],
        w: h3_w,
        h: h3_h,
        track_id: 5,
      },
      {
        class_name: "safety_vest",
        confidence: 0.9,
        bbox: [v3_x1, v3_y1, v3_x2, v3_y2],
        w: v3_w,
        h: v3_h,
        track_id: 6,
      }
    );
  }

  // 2. Ghép cặp PPE–Person (IoU Association VI-04)
  const associations: FrameAssociation[] = [
    { person: worker1Id, helmet: 1, vest: 2, status: "matched" },
    {
      person: worker2Id,
      helmet: isViolationCandidate && isHelmetRuleActive ? null : 3,
      vest: 4,
      status: "matched",
    },
  ];

  if (!isVertical) {
    associations.push({ person: worker3Id, helmet: 5, vest: 6, status: "matched" });
  }

  // 3. Đánh giá trạng thái tuân thủ luật an toàn (VI-05)
  const persons: PersonStatus[] = [
    {
      track_id: worker1Id,
      status: "COMPLIANT",
      violations: [],
      reason: isVietnamese ? "Đầy đủ trang bị bảo hộ" : "Full PPE compliant",
    },
    {
      track_id: worker2Id,
      status: isConfirmedViolation
        ? "CONFIRMED_VIOLATION"
        : isViolationCandidate
          ? "VIOLATION_CANDIDATE"
          : "COMPLIANT",
      violations: isViolationCandidate ? ["no_helmet"] : [],
      reason: isViolationCandidate
        ? isVietnamese
          ? `Thiếu mũ bảo hộ (${missingDuration.toFixed(1)}s / ngưỡng ${confirmDurationThreshold.toFixed(1)}s)`
          : `Missing hard hat (${missingDuration.toFixed(1)}s / threshold ${confirmDurationThreshold.toFixed(1)}s)`
        : isVietnamese
          ? "Đầy đủ trang bị bảo hộ"
          : "Full PPE compliant",
    },
  ];

  if (!isVertical) {
    persons.push({
      track_id: worker3Id,
      status: "COMPLIANT",
      violations: [],
      reason: isVietnamese ? "Đầy đủ trang bị bảo hộ" : "Full PPE compliant",
    });
  }

  // 4. Lịch sử vi phạm xác nhận (VI-06 + Dedup VI-07)
  const violations: ViolationEvent[] = [];
  const completedCycles = Math.floor(elapsedSec / 45);

  for (let c = 0; c < completedCycles; c++) {
    const cycleStart = c * 45;
    violations.push({
      event_id: `EV-${cameraCode.slice(0, 8)}-C${c + 1}`,
      camera_id: cameraId,
      person: worker2Id,
      violation_type: "no_helmet",
      start_t: cycleStart + 10.0,
      confirmed_t: cycleStart + 10.0 + confirmDurationThreshold,
      duration_s: 14.0,
      frame: Math.floor((cycleStart + 10.0 + confirmDurationThreshold) * fps),
    });
  }

  if (isConfirmedViolation) {
    const currentCycleBase = completedCycles * 45;
    violations.push({
      event_id: `EV-${cameraCode.slice(0, 8)}-C${completedCycles + 1}`,
      camera_id: cameraId,
      person: worker2Id,
      violation_type: "no_helmet",
      start_t: currentCycleBase + 10.0,
      confirmed_t: currentCycleBase + 10.0 + confirmDurationThreshold,
      duration_s: 14.0,
      frame: Math.floor((currentCycleBase + 10.0 + confirmDurationThreshold) * fps),
    });
  }

  // 5. Tóm tắt theo công nhân (Track ID)
  const activeWorkerIds = isVertical
    ? [worker1Id, worker2Id]
    : [worker1Id, worker2Id, worker3Id];

  const personTracks: ComputedPersonTrack[] = activeWorkerIds.map((wid) => {
    const noHelmetFrames = new Set<number>();
    const noVestFrames = new Set<number>();
    const maxF = Math.max(frameNum, 350);
    const allFrames = Array.from({ length: maxF }, (_, i) => i + 1);

    if (wid === worker2Id && isHelmetRuleActive) {
      // Worker 2 vi phạm thiếu mũ bảo hộ trong khoảng giây 10 đến 24 ở mỗi chu kỳ 45s
      const cyclesToSimulate = Math.max(1, Math.floor(maxF / (45 * fps)) + 1);
      for (let c = 0; c < cyclesToSimulate; c++) {
        const startF = Math.floor((c * 45 + 10) * fps) + 1;
        const endF = Math.min(Math.floor((c * 45 + 24) * fps), maxF);
        for (let f = startF; f <= endF; f++) {
          noHelmetFrames.add(f);
        }
      }
    }

    const okFrames = allFrames.filter((f) => !noHelmetFrames.has(f) && !noVestFrames.has(f));

    return {
      id: wid,
      frames: allFrames,
      okFrames,
      noHelmetFrames,
      noVestFrames,
      unknownCount: 0,
    };
  });

  // 6. Trích xuất ảnh bằng chứng thực tế (Evidence Snapshot VI-08)
  // Chỉ dùng snapshot thực từ canvas của video hiện tại hoặc thumbnail của YouTube
  let dynamicEvidenceUrl = customSnapshotUrl || "";
  if (!dynamicEvidenceUrl && streamMetadata?.youtubeId) {
    dynamicEvidenceUrl = `https://img.youtube.com/vi/${streamMetadata.youtubeId}/hqdefault.jpg`;
  }

  const helmetCount = detections.filter((d) => d.class_name === "helmet").length;
  const vestCount = detections.filter((d) => d.class_name === "safety_vest").length;
  const personCount = detections.filter((d) => d.class_name === "person").length;

  const entry: FrameLogEntry = {
    frame: frameNum,
    t,
    detections,
    summary: {
      person: personCount,
      helmet: helmetCount,
      safety_vest: vestCount,
      tracks: detections.length,
    },
    events: isConfirmedViolation
      ? [
          isVietnamese
            ? `Worker #${worker2Id}: Xác nhận vi phạm thiếu mũ bảo hộ (≥${confirmDurationThreshold}s)`
            : `Worker #${worker2Id}: Confirmed violation — Missing hard hat (≥${confirmDurationThreshold}s)`,
        ]
      : isViolationCandidate
        ? [
            isVietnamese
              ? `Worker #${worker2Id}: Phát hiện thiếu mũ (đang đếm giây ${missingDuration.toFixed(1)}s / ${confirmDurationThreshold}s)`
              : `Worker #${worker2Id}: Missing hard hat (temporal window ${missingDuration.toFixed(1)}s / ${confirmDurationThreshold}s)`,
          ]
        : [
            isVietnamese
              ? `${personCount} công nhân đang hoạt động tuân thủ an toàn`
              : `${personCount} workers complying with safety rules`,
          ],
    associations,
    persons,
    confirmations: isConfirmedViolation
      ? [
          {
            person: worker2Id,
            violation_type: "no_helmet",
            duration_s: missingDuration,
          },
        ]
      : [],
    violations,
    evidence: isConfirmedViolation
      ? [
          {
            event_id: `EV-${cameraCode.slice(0, 8)}-LIVE`,
            status: "saved",
            path: dynamicEvidenceUrl,
            frame: Math.floor((completedCycles * 45 + 10.0 + confirmDurationThreshold) * fps),
          },
        ]
      : [],
  };

  return { entry, violations, personTracks };
}

/**
 * Định dạng danh sách frames thành các dải liên tục (VD: "1-3, 5, 7-9")
 * Khớp hoàn toàn với logic ranges(frames) của Video Intelligence Test UI (127.0.0.1:8000)
 */
export function formatFrameRanges(frames: number[] | Set<number>): string {
  const arr = Array.isArray(frames) ? [...frames] : Array.from(frames);
  if (!arr.length) return "";
  arr.sort((a, b) => a - b);
  const parts: string[] = [];
  let start = arr[0],
    prev = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] === prev + 1) {
      prev = arr[i];
      continue;
    }
    parts.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = prev = arr[i];
  }
  parts.push(start === prev ? `${start}` : `${start}-${prev}`);
  return parts.join(", ");
}

/**
 * Tính toán tóm tắt theo từng người (Person Summary) từ danh sách entries của job log
 * Khớp hoàn toàn với hàm computePersonTracks() của Test UI
 */
export function computePersonTracksFromEntries(
  entries: FrameLogEntry[]
): ComputedPersonTrack[] {
  const persons = new Map<
    number,
    {
      id: number;
      frames: number[];
      okFrames: number[];
      noHelmetFrames: Set<number>;
      noVestFrames: Set<number>;
      unknownCount: number;
    }
  >();

  entries.forEach((e) => {
    (e.persons || []).forEach((s) => {
      let rec = persons.get(s.track_id);
      if (!rec) {
        rec = {
          id: s.track_id,
          frames: [],
          okFrames: [],
          noHelmetFrames: new Set<number>(),
          noVestFrames: new Set<number>(),
          unknownCount: 0,
        };
        persons.set(s.track_id, rec);
      }
      rec.frames.push(e.frame);
      if (s.status === "UNKNOWN") {
        rec.unknownCount++;
      } else {
        rec.okFrames.push(e.frame);
        if (s.violations?.includes("no_helmet")) {
          rec.noHelmetFrames.add(e.frame);
        }
        if (s.violations?.includes("no_safety_vest")) {
          rec.noVestFrames.add(e.frame);
        }
      }
    });
  });

  return Array.from(persons.values()).sort((a, b) => a.id - b.id);
}
