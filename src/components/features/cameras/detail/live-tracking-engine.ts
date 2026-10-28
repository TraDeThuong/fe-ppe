import type {
  ComputedPersonTrack,
  DetectionItem,
  FrameAssociation,
  FrameLogEntry,
  PersonStatus,
  ViolationEvent,
} from "./types";

/**
 * Real-Time Safety Rules Pipeline cho Camera Công Trường
 * Mô phỏng quá trình AI Edge Inference liên tục theo thời gian thực (real-time stream).
 *
 * Tọa độ 1920x1080 bám sát các công nhân đang thi công thực tế trong luồng camera:
 * - Worker #101: Thợ thi công chính ở góc phải gần camera (áo xanh, nón vàng)
 * - Worker #102: Thợ thi công trên bờ tường gạch giữa công trường (có chu kỳ tháo nón lau mồ hôi)
 * - Worker #103: Thợ vận chuyển vật liệu ở lối đi container bên phải
 * - Worker #104: Kỹ sư / Giám sát an toàn đứng gần container
 */

export function generateLiveFrameEntry(
  elapsedSec: number,
  cameraId: string = "CAM-01"
): {
  entry: FrameLogEntry;
  violations: ViolationEvent[];
  personTracks: ComputedPersonTrack[];
} {
  const fps = 25;
  const frameNum = Math.floor(elapsedSec * fps) + 1;
  const t = Math.round(elapsedSec * 10) / 10;

  // Chu kỳ vi phạm:
  // Cứ mỗi 60 giây:
  // Từ giây 12 đến giây 26: Worker #102 tháo nón bảo hộ để lau mồ hôi.
  // - Từ 12s -> 15s (3 giây liên tục): Trạng thái là VIOLATION_CANDIDATE (Ứng viên vi phạm)
  // - Từ 15s trở đi: Đạt ngưỡng ≥ 3.0s liên tục (VI-06) -> Xác nhận VI PHẠM (CONFIRMED_VIOLATION)
  const cycleSec = elapsedSec % 60;
  const isWorker102MissingHelmet = cycleSec >= 12 && cycleSec <= 26;
  const missingDuration = isWorker102MissingHelmet ? Math.min(cycleSec - 12, 14) : 0;
  const isWorker102Confirmed = isWorker102MissingHelmet && missingDuration >= 3.0;

  // Dao động vi chuyển động nhẹ (micro-jitter) tự nhiên
  const jitter1X = Math.sin(elapsedSec * 1.8) * 2;
  const jitter1Y = Math.cos(elapsedSec * 1.4) * 2;

  const jitter2X = Math.cos(elapsedSec * 1.5) * 3;
  const jitter2Y = Math.sin(elapsedSec * 1.2) * 2;

  const walk3X = Math.sin(elapsedSec * 0.4) * 20;

  // 1. Tọa độ chính xác theo độ phân giải Full HD (1920 x 1080)
  const detections: DetectionItem[] = [];

  // ── Worker #101: Công nhân ở góc phải gần camera (áo xanh, nón vàng) ──
  detections.push(
    {
      class_name: "person",
      confidence: Math.round((0.96 + Math.sin(elapsedSec) * 0.02) * 100) / 100,
      bbox: [
        Math.round(1570 + jitter1X),
        Math.round(860 + jitter1Y),
        Math.round(1760 + jitter1X),
        Math.round(1070 + jitter1Y),
      ],
      w: 190,
      h: 210,
      track_id: 101,
    },
    {
      class_name: "helmet",
      confidence: 0.94,
      bbox: [
        Math.round(1620 + jitter1X),
        Math.round(860 + jitter1Y),
        Math.round(1710 + jitter1X),
        Math.round(935 + jitter1Y),
      ],
      w: 90,
      h: 75,
      track_id: 1,
    },
    {
      class_name: "safety_vest",
      confidence: 0.95,
      bbox: [
        Math.round(1585 + jitter1X),
        Math.round(935 + jitter1Y),
        Math.round(1745 + jitter1X),
        Math.round(1065 + jitter1Y),
      ],
      w: 160,
      h: 130,
      track_id: 2,
    }
  );

  // ── Worker #102: Công nhân trên bờ tường gạch giữa công trường ──
  detections.push({
    class_name: "person",
    confidence: Math.round((0.93 + Math.cos(elapsedSec) * 0.03) * 100) / 100,
    bbox: [
      Math.round(1240 + jitter2X),
      Math.round(165 + jitter2Y),
      Math.round(1365 + jitter2X),
      Math.round(425 + jitter2Y),
    ],
    w: 125,
    h: 260,
    track_id: 102,
  });

  // Nếu không tháo nón thì vẽ nón
  if (!isWorker102MissingHelmet) {
    detections.push({
      class_name: "helmet",
      confidence: 0.91,
      bbox: [
        Math.round(1275 + jitter2X),
        Math.round(165 + jitter2Y),
        Math.round(1335 + jitter2X),
        Math.round(215 + jitter2Y),
      ],
      w: 60,
      h: 50,
      track_id: 3,
    });
  }

  // Áo phản quang của Worker #102
  detections.push({
    class_name: "safety_vest",
    confidence: 0.92,
    bbox: [
      Math.round(1250 + jitter2X),
      Math.round(215 + jitter2Y),
      Math.round(1355 + jitter2X),
      Math.round(340 + jitter2Y),
    ],
    w: 105,
    h: 125,
    track_id: 4,
  });

  // ── Worker #103: Công nhân đi lại ở lối đi container ──
  detections.push(
    {
      class_name: "person",
      confidence: 0.91,
      bbox: [
        Math.round(1580 + walk3X),
        240,
        Math.round(1675 + walk3X),
        425,
      ],
      w: 95,
      h: 185,
      track_id: 103,
    },
    {
      class_name: "helmet",
      confidence: 0.89,
      bbox: [
        Math.round(1610 + walk3X),
        240,
        Math.round(1650 + walk3X),
        278,
      ],
      w: 40,
      h: 38,
      track_id: 5,
    },
    {
      class_name: "safety_vest",
      confidence: 0.90,
      bbox: [
        Math.round(1590 + walk3X),
        278,
        Math.round(1668 + walk3X),
        360,
      ],
      w: 78,
      h: 82,
      track_id: 6,
    }
  );

  // ── Worker #104: Giám sát viên đứng gần container xanh ──
  detections.push(
    {
      class_name: "person",
      confidence: 0.94,
      bbox: [1135, 175, 1220, 345],
      w: 85,
      h: 170,
      track_id: 104,
    },
    {
      class_name: "helmet",
      confidence: 0.92,
      bbox: [1160, 175, 1200, 210],
      w: 40,
      h: 35,
      track_id: 7,
    },
    {
      class_name: "safety_vest",
      confidence: 0.93,
      bbox: [1145, 210, 1215, 285],
      w: 70,
      h: 75,
      track_id: 8,
    }
  );

  // 2. Ghép cặp PPE–Person (Association Logic VI-04)
  const associations: FrameAssociation[] = [
    { person: 101, helmet: 1, vest: 2, status: "matched" },
    {
      person: 102,
      helmet: isWorker102MissingHelmet ? null : 3,
      vest: 4,
      status: "matched",
    },
    { person: 103, helmet: 5, vest: 6, status: "matched" },
    { person: 104, helmet: 7, vest: 8, status: "matched" },
  ];

  // 3. Đánh giá trạng thái tuân thủ luật (Safety Rules VI-05)
  const persons: PersonStatus[] = [
    {
      track_id: 101,
      status: "COMPLIANT",
      violations: [],
      reason: "",
    },
    {
      track_id: 102,
      status: isWorker102Confirmed
        ? "CONFIRMED_VIOLATION"
        : isWorker102MissingHelmet
          ? "VIOLATION_CANDIDATE"
          : "COMPLIANT",
      violations: isWorker102MissingHelmet ? ["no_helmet"] : [],
      reason: isWorker102MissingHelmet
        ? `Không đội mũ bảo hộ (${missingDuration.toFixed(1)}s)`
        : "",
    },
    {
      track_id: 103,
      status: "COMPLIANT",
      violations: [],
      reason: "",
    },
    {
      track_id: 104,
      status: "COMPLIANT",
      violations: [],
      reason: "",
    },
  ];

  // 4. Lịch sử vi phạm xác nhận (Temporal Confirmation VI-06 + Dedup VI-07)
  const violations: ViolationEvent[] = [];
  const completedCycles = Math.floor(elapsedSec / 60);

  // Các chu kỳ trước đã xác nhận vi phạm
  for (let c = 0; c < completedCycles; c++) {
    const cycleStart = c * 60;
    violations.push({
      event_id: `EV-${cameraId.slice(0, 5)}-C${c + 1}`,
      camera_id: cameraId,
      person: 102,
      violation_type: "no_helmet",
      start_t: cycleStart + 12.0,
      confirmed_t: cycleStart + 15.0,
      duration_s: 14.0,
      frame: Math.floor((cycleStart + 15.0) * fps),
    });
  }

  // Chu kỳ hiện tại nếu đã đủ ≥ 3.0s vi phạm liên tục
  if (isWorker102Confirmed) {
    const currentCycleBase = completedCycles * 60;
    violations.push({
      event_id: `EV-${cameraId.slice(0, 5)}-NOW`,
      camera_id: cameraId,
      person: 102,
      violation_type: "no_helmet",
      start_t: currentCycleBase + 12.0,
      confirmed_t: currentCycleBase + 15.0,
      duration_s: Math.round(missingDuration * 10) / 10,
      frame: Math.floor((currentCycleBase + 15.0) * fps),
    });
  }

  // 5. Tóm tắt theo công nhân (Track ID)
  const personTracks: ComputedPersonTrack[] = [
    {
      id: 101,
      frames: Array.from({ length: Math.min(frameNum, 500) }, (_, i) => i + 1),
      okFrames: Array.from({ length: Math.min(frameNum, 500) }, (_, i) => i + 1),
      noHelmetFrames: new Set<number>(),
      noVestFrames: new Set<number>(),
      unknownCount: 0,
    },
    {
      id: 102,
      frames: Array.from({ length: Math.min(frameNum, 500) }, (_, i) => i + 1),
      okFrames: Array.from({ length: Math.min(frameNum, 500) }, (_, i) => i + 1),
      noHelmetFrames: isWorker102MissingHelmet
        ? new Set<number>([frameNum])
        : new Set<number>(),
      noVestFrames: new Set<number>(),
      unknownCount: 0,
    },
    {
      id: 103,
      frames: Array.from({ length: Math.min(frameNum, 500) }, (_, i) => i + 1),
      okFrames: Array.from({ length: Math.min(frameNum, 500) }, (_, i) => i + 1),
      noHelmetFrames: new Set<number>(),
      noVestFrames: new Set<number>(),
      unknownCount: 0,
    },
    {
      id: 104,
      frames: Array.from({ length: Math.min(frameNum, 500) }, (_, i) => i + 1),
      okFrames: Array.from({ length: Math.min(frameNum, 500) }, (_, i) => i + 1),
      noHelmetFrames: new Set<number>(),
      noVestFrames: new Set<number>(),
      unknownCount: 0,
    },
  ];

  // 6. Thống kê tổng quan frame
  const helmetCount = detections.filter((d) => d.class_name === "helmet").length;
  const vestCount = detections.filter((d) => d.class_name === "safety_vest").length;

  const entry: FrameLogEntry = {
    frame: frameNum,
    t,
    detections,
    summary: {
      person: 4,
      helmet: helmetCount,
      safety_vest: vestCount,
      tracks: detections.length,
    },
    events: isWorker102Confirmed
      ? ["🚨 Worker #102: Xác nhận vi phạm không đội mũ (≥3s)"]
      : isWorker102MissingHelmet
        ? ["⚠ Worker #102: Tháo mũ bảo hộ (đang đếm giây vi phạm)"]
        : ["+ 4 công nhân đang hoạt động an toàn"],
    associations,
    persons,
    confirmations: isWorker102Confirmed
      ? [
          {
            person: 102,
            violation_type: "no_helmet",
            duration_s: missingDuration,
          },
        ]
      : [],
    violations,
    evidence: isWorker102Confirmed
      ? [
          {
            event_id: `EV-${cameraId.slice(0, 5)}-NOW`,
            status: "saved",
            path: "/images/camera-live-evidence.jpg",
            frame: Math.floor((completedCycles * 60 + 15.0) * fps),
          },
        ]
      : [],
  };

  return { entry, violations, personTracks };
}
