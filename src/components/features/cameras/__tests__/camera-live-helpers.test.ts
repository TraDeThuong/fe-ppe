import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildCameraHotConfigPayload,
  buildCameraStartPayload,
  canAutoStartCameraSource,
  deriveLiveDefaultsFromConfig,
  extractIncidentEvidencePair,
  filterSessionsForCameras,
  findSessionForCamera,
  getYouTubeEmbedUrl,
  hasMaskedCredentials,
  isHtml5VideoUrl,
  isSupportedLiveSource,
  mergeCameraEvidences,
  normalizeIncidentEvidences,
  resolveCameraSourceIssue,
  resolveEditedStreamUrl,
  resolveInitialCameraSource,
  selectAutoStartCandidates,
  toLiveRoiPolygons,
  toSafeLiveCameraId,
} from "../camera-live-helpers";
import type { EvidenceItem, LiveSessionInfo, LiveVideoItem } from "@/types/ai-test.types";
import type { CameraItem, IncidentItem } from "@/types";

const sampleCamera: CameraItem = {
  id: "cam-uuid-1234",
  siteId: "site-1",
  name: "Cổng Chính A",
  code: "CAM 01/Zone A",
  sourceType: "RTSP",
  streamUrl: "rtsp://192.168.1.50:554/stream1",
  status: "ONLINE",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const uploadedVideos: LiveVideoItem[] = [
  { filename: "abc123def456.mp4", stem: "abc123def456", size_mb: 12.5 },
];

test("toSafeLiveCameraId normalizes camera codes into backend-safe SafeId strings", () => {
  assert.equal(toSafeLiveCameraId(sampleCamera), "CAM-01-Zone-A");
  assert.equal(toSafeLiveCameraId("   "), "CAM-01");
});

test("isSupportedLiveSource validates strictly against BE _resolve_live_source allowlist", () => {
  assert.equal(isSupportedLiveSource("0"), true);
  assert.equal(isSupportedLiveSource("rtsp://user:pass@10.0.0.1:554/ch1"), true);
  assert.equal(isSupportedLiveSource("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), true);
  assert.equal(isSupportedLiveSource("abc123def456.mp4", uploadedVideos), true);
  assert.equal(isSupportedLiveSource("/videos/cameras/old-mock.mp4", uploadedVideos), false);
  assert.equal(isSupportedLiveSource(""), false);
});

test("resolveInitialCameraSource uses valid DB streamUrl or falls back cleanly to server video", () => {
  assert.deepEqual(resolveInitialCameraSource(sampleCamera, uploadedVideos), {
    source: "rtsp://192.168.1.50:554/stream1",
    usesFallbackServerVideo: false,
    cameraSourceNote: null,
  });

  const legacyCam: CameraItem = {
    ...sampleCamera,
    streamUrl: "/videos/cameras/gate-demo.mp4",
  };
  const fallbackRes = resolveInitialCameraSource(legacyCam, uploadedVideos);
  assert.equal(fallbackRes.source, "abc123def456.mp4");
  assert.equal(fallbackRes.usesFallbackServerVideo, true);
  assert.ok(fallbackRes.cameraSourceNote?.includes("/videos/cameras/gate-demo.mp4"));
});

test("buildCameraStartPayload & buildCameraHotConfigPayload enforce BE schema without extra fields", () => {
  const startPayload = buildCameraStartPayload(sampleCamera, {
    source: "rtsp://10.0.0.5/live",
    model: "best.pt",
    targetFps: 120,
    aiFps: 0,
    confirmHelmetSec: 0.1,
    confirmVestSec: 5.5,
    enableNoHelmet: true,
    enableNoVest: false,
    enableRestrictedArea: true,
    enableSceneCut: true,
  });

  assert.deepEqual(startPayload, {
    camera_id: "CAM-01-Zone-A",
    source: "rtsp://10.0.0.5/live",
    model: "best.pt",
    target_fps: 60,
    ai_fps: 1,
    confirmation_duration_s: 0.5,
    confirmation_duration_vest_s: 5.5,
    enable_no_helmet: true,
    enable_no_vest: false,
    enable_restricted_area: true,
    enable_scene_cut: true,
  });

  assert.deepEqual(
    Object.keys(startPayload).sort(),
    [
      "ai_fps",
      "camera_id",
      "confirmation_duration_s",
      "confirmation_duration_vest_s",
      "enable_no_helmet",
      "enable_no_vest",
      "enable_restricted_area",
      "enable_scene_cut",
      "model",
      "source",
      "target_fps",
    ].sort(),
  );

  const hotPayload = buildCameraHotConfigPayload({
    targetFps: 25,
    aiFps: 15,
    confirmHelmetSec: 2.0,
    confirmVestSec: 4.0,
    enableNoHelmet: true,
    enableNoVest: true,
    enableRestrictedArea: false,
    enableSceneCut: true,
  });
  assert.equal(hotPayload.enable_restricted_area, false);
  assert.equal(hotPayload.target_fps, 25);
});

test("deriveLiveDefaultsFromConfig & findSessionForCamera map config and running sessions", () => {
  const defaults = deriveLiveDefaultsFromConfig({
    id: "cfg-1",
    cameraId: sampleCamera.id,
    enabled: true,
    captureFps: 30,
    resolution: "1280x720",
    processingEnabled: false,
    createdAt: "",
    updatedAt: "",
  });
  assert.equal(defaults.targetFps, 30);
  assert.equal(defaults.enableNoHelmet, false);
  assert.equal(defaults.enableSceneCut, true);

  const sess: LiveSessionInfo = {
    camera_id: "CAM-01-Zone-A",
    status: "running",
    metrics: { fps: 24.5, active_persons: 3 },
  };
  const map = new Map<string, LiveSessionInfo>([[sess.camera_id, sess]]);
  assert.deepEqual(findSessionForCamera(map, sampleCamera), sess);
});

test("deriveLiveDefaultsFromConfig hydrates independent helmet and vest confirmation durations without dragging vest to 2.0s", () => {
  const defaults = deriveLiveDefaultsFromConfig(
    {
      id: "cfg-1",
      cameraId: sampleCamera.id,
      enabled: true,
      captureFps: 20,
      resolution: "1280x720",
      processingEnabled: true,
      createdAt: "",
      updatedAt: "",
    },
    {
      siteId: "site-1",
      siteName: null,
      siteCode: null,
      cameraId: sampleCamera.id,
      cameraName: null,
      cameraCode: null,
      confidenceThreshold: 0.7,
      helmetConfirmationDuration: 3.5,
      confirmationDuration: 3.5,
      vestConfirmationDuration: 6.0,
      cooldownDuration: 110,
      rules: { enableNoHelmet: true, enableNoVest: false, enableRestrictedArea: false },
      source: "SITE_LEVEL",
      resolvedAt: "",
    },
  );
  assert.equal(defaults.targetFps, 20);
  assert.equal(defaults.enableNoHelmet, true);
  assert.equal(defaults.enableNoVest, false);
  assert.equal(defaults.enableRestrictedArea, false);
  assert.equal(defaults.confirmHelmetSec, 3.5);
  assert.equal(defaults.confirmVestSec, 6.0);
  assert.equal(defaults.confidenceThreshold, 0.7);
  assert.equal(defaults.cooldownSec, 110);

  const startPayload = buildCameraStartPayload(sampleCamera, {
    source: "sample.mp4",
    ...defaults,
  });
  assert.equal(startPayload.confidence_threshold, 0.7);
  assert.equal(startPayload.cooldown_s, 110);
  assert.equal(startPayload.confirmation_duration_s, 3.5);
  assert.equal(startPayload.confirmation_duration_vest_s, 6.0);

  const hotPayload = buildCameraHotConfigPayload(defaults);
  assert.equal(hotPayload.confidence_threshold, 0.7);
  assert.equal(hotPayload.cooldown_s, 110);
  assert.equal(hotPayload.confirmation_duration_s, 3.5);
  assert.equal(hotPayload.confirmation_duration_vest_s, 6.0);

  // Backward compatibility: legacy payload missing vestConfirmationDuration keeps Vest at 4.0s
  const legacyDefaults = deriveLiveDefaultsFromConfig(null, {
    siteId: "site-1",
    siteName: null,
    siteCode: null,
    cameraId: sampleCamera.id,
    cameraName: null,
    cameraCode: null,
    confidenceThreshold: 0.8,
    confirmationDuration: 2.0,
    cooldownDuration: 30,
    rules: { enableNoHelmet: true, enableNoVest: true, enableRestrictedArea: true },
    source: "SITE_LEVEL",
    resolvedAt: "",
  });
  assert.equal(legacyDefaults.confirmHelmetSec, 2.0);
  assert.equal(legacyDefaults.confirmVestSec, 4.0);
});

test("hasMaskedCredentials, canAutoStartCameraSource & resolveCameraSourceIssue reject masked RTSP and HTTPS .mp4", () => {
  assert.equal(hasMaskedCredentials("rtsp://admin:***@10.0.0.1:554/stream"), true);
  assert.equal(hasMaskedCredentials("rtsp://admin:pass@10.0.0.1:554/stream"), false);

  assert.equal(canAutoStartCameraSource(sampleCamera, uploadedVideos), true);
  assert.equal(
    canAutoStartCameraSource(
      { ...sampleCamera, streamUrl: "rtsp://admin:***@10.0.0.1:554/stream" },
      uploadedVideos,
    ),
    false,
  );
  assert.equal(
    canAutoStartCameraSource(
      {
        ...sampleCamera,
        sourceType: "FILE",
        streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      },
      uploadedVideos,
    ),
    false,
  );
  // Dead DB sourceType "WEBCAM" with empty streamUrl is no longer treated as auto-runnable
  assert.equal(
    canAutoStartCameraSource({ sourceType: "WEBCAM", streamUrl: "" }, uploadedVideos),
    false,
  );
  // YouTube with HTTP sourceType is directly runnable on AI Engine
  assert.equal(
    canAutoStartCameraSource(
      { sourceType: "HTTP", streamUrl: "https://www.youtube.com/watch?v=1-iS7LArMPA" },
      uploadedVideos,
    ),
    true,
  );

  // resolveEditedStreamUrl protects masked credentials on EditCameraModal submit
  assert.deepEqual(
    resolveEditedStreamUrl(
      "rtsp://admin:***@10.0.0.1:554/stream",
      "rtsp://admin:***@10.0.0.1:554/stream",
    ),
    { ok: true, streamUrl: undefined },
  );
  assert.deepEqual(
    resolveEditedStreamUrl(
      "rtsp://admin:***@10.0.0.99:554/stream",
      "rtsp://admin:***@10.0.0.1:554/stream",
    ),
    { ok: false, errorCode: "MASKED_PASSWORD_CHANGED" },
  );
  assert.deepEqual(
    resolveEditedStreamUrl("   ", "rtsp://admin:***@10.0.0.1:554/stream"),
    { ok: false, errorCode: "EMPTY_URL" },
  );
  assert.deepEqual(
    resolveEditedStreamUrl(
      "rtsp://admin:NewPass123@10.0.0.99:554/stream",
      "rtsp://admin:***@10.0.0.1:554/stream",
    ),
    { ok: true, streamUrl: "rtsp://admin:NewPass123@10.0.0.99:554/stream" },
  );

  const maskedIssue = resolveCameraSourceIssue(
    { sourceType: "RTSP", streamUrl: "rtsp://admin:***@10.0.0.1/live" },
    uploadedVideos,
  );
  assert.ok(maskedIssue?.includes(":***@"));

  assert.equal(isHtml5VideoUrl("https://cdn.example.com/demo.mp4?token=1"), true);
  assert.equal(isHtml5VideoUrl("rtsp://10.0.0.1/stream"), false);
  assert.equal(
    getYouTubeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
  );
});

test("normalizeIncidentEvidences & mergeCameraEvidences adapt DB evidences without duplicates", () => {
  const incidents: IncidentItem[] = [
    {
      id: "inc-001-uuid",
      siteId: "site-1",
      cameraId: sampleCamera.id,
      violationType: "NO_HELMET",
      severity: "HIGH",
      status: "PENDING_REVIEW",
      detectedAt: "2026-11-15T10:00:00Z",
      description: "Worker Track #7 missing helmet",
      createdAt: "2026-11-15T10:00:00Z",
      updatedAt: "2026-11-15T10:00:00Z",
      evidences: [
        {
          id: "ev-ref",
          incidentId: "inc-001-uuid",
          cameraId: sampleCamera.id,
          evidenceType: "REFERENCE_SNAPSHOT",
          storageKey: "cameras/cam1/ref.jpg",
          fileName: "ref.jpg",
          mimeType: "image/jpeg",
          fileSize: 1024,
          capturedAt: "2026-11-15T09:59:58Z",
          createdAt: "2026-11-15T09:59:58Z",
        },
        {
          id: "ev-snap",
          incidentId: "inc-001-uuid",
          cameraId: sampleCamera.id,
          evidenceType: "SNAPSHOT",
          storageKey: "cameras/cam1/snap.jpg",
          fileName: "snap.jpg",
          mimeType: "image/jpeg",
          fileSize: 2048,
          capturedAt: "2026-11-15T10:00:00Z",
          createdAt: "2026-11-15T10:00:00Z",
        },
      ],
    },
  ];

  const dbEvidences = normalizeIncidentEvidences("CAM-01", incidents);
  assert.equal(dbEvidences.length, 1);
  assert.equal(dbEvidences[0].id, "db-inc-001-uuid");
  assert.equal(dbEvidences[0].trackId, "7");
  assert.equal(dbEvidences[0].beforeUrl, "http://localhost:9000/ppe-evidences/cameras/cam1/ref.jpg");
  assert.equal(dbEvidences[0].afterUrl, "http://localhost:9000/ppe-evidences/cameras/cam1/snap.jpg");

  const extractedPair = extractIncidentEvidencePair(
    { ...incidents[0], trackId: 42 },
    "CAM-01",
  );
  assert.equal(extractedPair.isPair, true);
  assert.equal(extractedPair.lightboxItem?.trackId, "42");
  assert.equal(
    extractedPair.beforeUrl,
    "http://localhost:9000/ppe-evidences/cameras/cam1/ref.jpg",
  );
  assert.equal(
    extractedPair.afterUrl,
    "http://localhost:9000/ppe-evidences/cameras/cam1/snap.jpg",
  );

  const liveEvidences: EvidenceItem[] = [
    {
      id: "live-1",
      source: "live",
      sourceId: "CAM-01",
      type: "NO_HELMET",
      trackId: "7",
      beforeUrl: null,
      afterUrl: "http://localhost:9000/ppe-evidences/cameras/cam1/snap.jpg",
      primaryUrl: "http://localhost:9000/ppe-evidences/cameras/cam1/snap.jpg",
    },
    {
      id: "live-2",
      source: "live",
      sourceId: "CAM-01",
      type: "NO_VEST",
      trackId: "9",
      beforeUrl: null,
      afterUrl: "/api/ai-test/live/evidence/snap2.jpg",
      primaryUrl: "/api/ai-test/live/evidence/snap2.jpg",
    },
  ];

  const merged = mergeCameraEvidences(liveEvidences, dbEvidences);
  // live-1 shares exact afterUrl with dbEvidences[0], so deduplicated to 2 items total
  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, "live-1");
  assert.equal(merged[1].id, "live-2");
});

test("selectAutoStartCandidates picks ONLINE runnable cameras within session capacity", () => {
  const cam1: CameraItem = { ...sampleCamera, id: "c1", code: "CAM-01", status: "ONLINE" };
  const cam2Offline: CameraItem = { ...sampleCamera, id: "c2", code: "CAM-02", status: "OFFLINE" };
  const cam3Masked: CameraItem = {
    ...sampleCamera,
    id: "c3",
    code: "CAM-03",
    status: "ONLINE",
    streamUrl: "rtsp://admin:***@10.0.0.3:554/stream",
  };
  const cam4AlreadyRunning: CameraItem = { ...sampleCamera, id: "c4", code: "CAM-04", status: "ONLINE" };
  const cam5Runnable: CameraItem = { ...sampleCamera, id: "c5", code: "CAM-05", status: "ONLINE" };
  const cam6Attempted: CameraItem = { ...sampleCamera, id: "c6", code: "CAM-06", status: "ONLINE" };
  const cam7Overflow: CameraItem = { ...sampleCamera, id: "c7", code: "CAM-07", status: "ONLINE" };
  const cam8PausedAi: CameraItem = {
    ...sampleCamera,
    id: "c8",
    code: "CAM-08",
    status: "ONLINE",
    config: {
      id: "cfg-8",
      cameraId: "c8",
      enabled: true,
      captureFps: 10,
      resolution: "1920x1080",
      processingEnabled: false,
      createdAt: "",
      updatedAt: "",
    },
  };

  const activeSessions: LiveSessionInfo[] = [
    { camera_id: "CAM-04", status: "running" },
    { camera_id: "EXT-CAM", status: "initializing" },
  ];

  const selected = selectAutoStartCandidates(
    [cam1, cam2Offline, cam3Masked, cam4AlreadyRunning, cam8PausedAi, cam5Runnable, cam6Attempted, cam7Overflow],
    activeSessions,
    uploadedVideos,
    {
      maxTotalSessions: 4,
      attemptedIds: new Set(["c6"]),
    },
  );

  // 2 slots already occupied (CAM-04 + EXT-CAM), cam8PausedAi skipped (processingEnabled=false), so at most 2 new cameras selected: c1 and c5
  assert.deepEqual(
    selected.map((c) => c.id),
    ["c1", "c5"],
  );
});

test("productionMode supports masked RTSP via M2M camera_uuid lookup and dynamic session limits", () => {
  const maskedCamera: CameraItem = {
    ...sampleCamera,
    id: "cam-uuid-masked-1",
    code: "CAM-MASKED-01",
    streamUrl: "rtsp://admin:***@10.0.0.10:554/stream1",
    status: "ONLINE",
  };

  // In production mode, masked RTSP is runnable and has no error note
  assert.equal(
    canAutoStartCameraSource(maskedCamera, uploadedVideos, { productionMode: true }),
    true,
  );
  assert.equal(
    resolveCameraSourceIssue(maskedCamera, uploadedVideos, { productionMode: true }),
    null,
  );
  assert.deepEqual(
    resolveInitialCameraSource(maskedCamera, uploadedVideos, { productionMode: true }),
    {
      source: "rtsp://admin:***@10.0.0.10:554/stream1",
      usesFallbackServerVideo: false,
      cameraSourceNote: null,
    },
  );

  // buildCameraStartPayload omits masked source and passes camera_uuid for M2M lookup
  const maskedPayload = buildCameraStartPayload(
    maskedCamera,
    {
      source: maskedCamera.streamUrl,
      targetFps: 25,
      aiFps: 15,
      confirmHelmetSec: 2,
      confirmVestSec: 4,
      enableNoHelmet: true,
      enableNoVest: true,
      enableRestrictedArea: true,
      enableSceneCut: true,
    },
    { productionMode: true },
  );
  assert.equal(maskedPayload.camera_uuid, "cam-uuid-masked-1");
  assert.equal("source" in maskedPayload, false);

  // Explicit non-masked override preserves source alongside camera_uuid
  const overridePayload = buildCameraStartPayload(
    maskedCamera,
    {
      source: "sample.mp4",
      targetFps: 25,
      aiFps: 15,
      confirmHelmetSec: 2,
      confirmVestSec: 4,
      enableNoHelmet: true,
      enableNoVest: true,
      enableRestrictedArea: true,
      enableSceneCut: true,
    },
    { productionMode: true },
  );
  assert.equal(overridePayload.camera_uuid, "cam-uuid-masked-1");
  assert.equal(overridePayload.source, "sample.mp4");

  // selectAutoStartCandidates selects masked RTSP in production mode & counts reconnecting sessions
  const selectedProd = selectAutoStartCandidates(
    [maskedCamera],
    [{ camera_id: "OTHER", status: "reconnecting" }],
    uploadedVideos,
    { productionMode: true, maxTotalSessions: 16 },
  );
  assert.deepEqual(
    selectedProd.map((c) => c.id),
    ["cam-uuid-masked-1"],
  );
});

test("filterSessionsForCameras separates matched DB camera sessions from orphaned sessions", () => {
  const sessions: LiveSessionInfo[] = [
    { camera_id: "CAM-01-Zone-A", status: "running", metrics: { active_persons: 3 } },
    { camera_id: "DELETED-CAM-1", status: "running", metrics: { active_persons: 4 } },
    { camera_id: "DELETED-CAM-2", camera_uuid: "deleted-uuid", status: "running" },
  ];

  // When cameras exist, only matching sessions are kept
  const withCam = filterSessionsForCameras(sessions, [sampleCamera]);
  assert.deepEqual(
    withCam.matchedSessions.map((s) => s.camera_id),
    ["CAM-01-Zone-A"],
  );
  assert.deepEqual(
    withCam.orphanedSessions.map((s) => s.camera_id),
    ["DELETED-CAM-1", "DELETED-CAM-2"],
  );

  // When all cameras are deleted (empty array), all sessions are classified as orphaned
  const whenEmpty = filterSessionsForCameras(sessions, []);
  assert.equal(whenEmpty.matchedSessions.length, 0);
  assert.equal(whenEmpty.orphanedSessions.length, 3);
});

test("toLiveRoiPolygons ignores zero-area site placeholders and converts plotted camera polygons", () => {
  // Placeholder [{0,0}, {0,0}, {0,0}] created at Site level -> null (unplotted)
  assert.equal(
    toLiveRoiPolygons([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ]),
    null,
  );

  // Plotted polygon on camera -> [[[x, y], ...]]
  const plotted = [
    { x: 0.2, y: 0.3 },
    { x: 0.8, y: 0.3 },
    { x: 0.7, y: 0.85 },
  ];
  assert.deepEqual(toLiveRoiPolygons(plotted), [
    [
      [0.2, 0.3],
      [0.8, 0.3],
      [0.7, 0.85],
    ],
  ]);

  const startWithRoi = buildCameraStartPayload(sampleCamera, {
    source: "rtsp://10.0.0.5/live",
    targetFps: 25,
    aiFps: 15,
    confirmHelmetSec: 2,
    confirmVestSec: 4,
    enableNoHelmet: true,
    enableNoVest: true,
    enableRestrictedArea: true,
    enableSceneCut: true,
    roiPolygon: plotted,
  });
  assert.deepEqual(startWithRoi.roi_polygons, [
    [
      [0.2, 0.3],
      [0.8, 0.3],
      [0.7, 0.85],
    ],
  ]);
});
