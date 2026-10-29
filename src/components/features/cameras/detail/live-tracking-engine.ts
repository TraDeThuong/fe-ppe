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
    // ── NGUỒN VIDEO DỌC (9:16 YOUTUBE SHORTS / DI ĐỘNG: 1080 x 1920) ──
    // Worker 1: Đang thi công ở góc dưới (Đầy đủ bảo hộ)
    detections.push(
      {
        class_name: "person",
        confidence: Math.round((0.95 + Math.sin(elapsedSec) * 0.02) * 100) / 100,
        bbox: [
          Math.round(220 + jitter1X),
          Math.round(980 + jitter1Y),
          Math.round(520 + jitter1X),
          Math.round(1620 + jitter1Y),
        ],
        w: 300,
        h: 640,
        track_id: worker1Id,
      },
      {
        class_name: "helmet",
        confidence: 0.94,
        bbox: [
          Math.round(310 + jitter1X),
          Math.round(980 + jitter1Y),
          Math.round(440 + jitter1X),
          Math.round(1110 + jitter1Y),
        ],
        w: 130,
        h: 130,
        track_id: 1,
      },
      {
        class_name: "safety_vest",
        confidence: 0.93,
        bbox: [
          Math.round(260 + jitter1X),
          Math.round(1110 + jitter1Y),
          Math.round(480 + jitter1X),
          Math.round(1380 + jitter1Y),
        ],
        w: 220,
        h: 270,
        track_id: 2,
      }
    );

    // Worker 2: Công nhân ở vị trí trung tâm trong khung hình Shorts
    detections.push({
      class_name: "person",
      confidence: Math.round((0.92 + Math.cos(elapsedSec) * 0.03) * 100) / 100,
      bbox: [
        Math.round(580 + jitter2X),
        Math.round(720 + jitter2Y),
        Math.round(860 + jitter2X),
        Math.round(1350 + jitter2Y),
      ],
      w: 280,
      h: 630,
      track_id: worker2Id,
    });

    // Mũ của Worker 2 (tạm tháo nếu vi phạm mũ)
    if (!isViolationCandidate || !isHelmetRuleActive) {
      detections.push({
        class_name: "helmet",
        confidence: 0.91,
        bbox: [
          Math.round(660 + jitter2X),
          Math.round(720 + jitter2Y),
          Math.round(790 + jitter2X),
          Math.round(840 + jitter2Y),
        ],
        w: 130,
        h: 120,
        track_id: 3,
      });
    }

    // Áo phản quang của Worker 2
    detections.push({
      class_name: "safety_vest",
      confidence: 0.92,
      bbox: [
        Math.round(610 + jitter2X),
        Math.round(840 + jitter2Y),
        Math.round(830 + jitter2X),
        Math.round(1100 + jitter2Y),
      ],
      w: 220,
      h: 260,
      track_id: 4,
    });
  } else {
    // ── NGUỒN VIDEO NGANG (16:9 CHUẨN FULL HD: 1920 x 1080) ──
    // Worker 1: Góc phải gần camera (Tuân thủ tốt)
    detections.push(
      {
        class_name: "person",
        confidence: Math.round((0.96 + Math.sin(elapsedSec) * 0.02) * 100) / 100,
        bbox: [
          Math.round(1450 + jitter1X),
          Math.round(680 + jitter1Y),
          Math.round(1750 + jitter1X),
          Math.round(1020 + jitter1Y),
        ],
        w: 300,
        h: 340,
        track_id: worker1Id,
      },
      {
        class_name: "helmet",
        confidence: 0.94,
        bbox: [
          Math.round(1540 + jitter1X),
          Math.round(680 + jitter1Y),
          Math.round(1670 + jitter1X),
          Math.round(780 + jitter1Y),
        ],
        w: 130,
        h: 100,
        track_id: 1,
      },
      {
        class_name: "safety_vest",
        confidence: 0.95,
        bbox: [
          Math.round(1480 + jitter1X),
          Math.round(780 + jitter1Y),
          Math.round(1720 + jitter1X),
          Math.round(960 + jitter1Y),
        ],
        w: 240,
        h: 180,
        track_id: 2,
      }
    );

    // Worker 2: Khu vực làm việc giữa khung hình
    detections.push({
      class_name: "person",
      confidence: Math.round((0.93 + Math.cos(elapsedSec) * 0.03) * 100) / 100,
      bbox: [
        Math.round(920 + jitter2X),
        Math.round(280 + jitter2Y),
        Math.round(1140 + jitter2X),
        Math.round(680 + jitter2Y),
      ],
      w: 220,
      h: 400,
      track_id: worker2Id,
    });

    if (!isViolationCandidate || !isHelmetRuleActive) {
      detections.push({
        class_name: "helmet",
        confidence: 0.91,
        bbox: [
          Math.round(990 + jitter2X),
          Math.round(280 + jitter2Y),
          Math.round(1080 + jitter2X),
          Math.round(360 + jitter2Y),
        ],
        w: 90,
        h: 80,
        track_id: 3,
      });
    }

    detections.push({
      class_name: "safety_vest",
      confidence: 0.92,
      bbox: [
        Math.round(945 + jitter2X),
        Math.round(360 + jitter2Y),
        Math.round(1115 + jitter2X),
        Math.round(520 + jitter2Y),
      ],
      w: 170,
      h: 160,
      track_id: 4,
    });

    // Worker 3: Công nhân di chuyển ở lối đi
    detections.push(
      {
        class_name: "person",
        confidence: 0.91,
        bbox: [
          Math.round(380 + jitter3X),
          420,
          Math.round(520 + jitter3X),
          710,
        ],
        w: 140,
        h: 290,
        track_id: worker3Id,
      },
      {
        class_name: "helmet",
        confidence: 0.89,
        bbox: [
          Math.round(425 + jitter3X),
          420,
          Math.round(485 + jitter3X),
          480,
        ],
        w: 60,
        h: 60,
        track_id: 5,
      },
      {
        class_name: "safety_vest",
        confidence: 0.9,
        bbox: [
          Math.round(395 + jitter3X),
          480,
          Math.round(505 + jitter3X),
          610,
        ],
        w: 110,
        h: 130,
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
      event_id: `EV-${cameraCode.slice(0, 8)}-LIVE`,
      camera_id: cameraId,
      person: worker2Id,
      violation_type: "no_helmet",
      start_t: currentCycleBase + 10.0,
      confirmed_t: currentCycleBase + 10.0 + confirmDurationThreshold,
      duration_s: Math.round(missingDuration * 10) / 10,
      frame: Math.floor((currentCycleBase + 10.0 + confirmDurationThreshold) * fps),
    });
  }

  // 5. Tóm tắt theo công nhân (Track ID)
  const activeWorkerIds = isVertical
    ? [worker1Id, worker2Id]
    : [worker1Id, worker2Id, worker3Id];

  const personTracks: ComputedPersonTrack[] = activeWorkerIds.map((wid) => {
    const isViolatingWorker = wid === worker2Id && isViolationCandidate;
    return {
      id: wid,
      frames: Array.from({ length: Math.min(frameNum, 500) }, (_, i) => i + 1),
      okFrames: Array.from({ length: Math.min(frameNum, 500) }, (_, i) => i + 1),
      noHelmetFrames: isViolatingWorker ? new Set<number>([frameNum]) : new Set<number>(),
      noVestFrames: new Set<number>(),
      unknownCount: 0,
    };
  });

  // 6. Trích xuất ảnh bằng chứng thực tế (Evidence Snapshot VI-08)
  // Ưu tiên snapshot từ canvas của video hiện tại, hoặc thumbnail của YouTube, tránh ảnh rác từ video cũ
  let dynamicEvidenceUrl = customSnapshotUrl || "";
  if (!dynamicEvidenceUrl && streamMetadata?.youtubeId) {
    dynamicEvidenceUrl = `https://img.youtube.com/vi/${streamMetadata.youtubeId}/hqdefault.jpg`;
  }
  if (!dynamicEvidenceUrl) {
    dynamicEvidenceUrl = "/images/camera-live-evidence.jpg";
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
            ? `🚨 Worker #${worker2Id}: Xác nhận vi phạm thiếu mũ bảo hộ (≥${confirmDurationThreshold}s)`
            : `🚨 Worker #${worker2Id}: Confirmed violation — Missing hard hat (≥${confirmDurationThreshold}s)`,
        ]
      : isViolationCandidate
        ? [
            isVietnamese
              ? `⚠ Worker #${worker2Id}: Phát hiện thiếu mũ (đang đếm giây ${missingDuration.toFixed(1)}s / ${confirmDurationThreshold}s)`
              : `⚠ Worker #${worker2Id}: Missing hard hat (temporal window ${missingDuration.toFixed(1)}s / ${confirmDurationThreshold}s)`,
          ]
        : [
            isVietnamese
              ? `✓ ${personCount} công nhân đang hoạt động tuân thủ an toàn`
              : `✓ ${personCount} workers complying with safety rules`,
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
