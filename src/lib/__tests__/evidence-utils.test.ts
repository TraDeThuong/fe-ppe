import assert from "node:assert/strict";
import test from "node:test";
import {
  extractEvidenceBoundingBoxes,
  filterEvidencesClientSide,
  formatEvidenceFileSize,
  formatMediaDuration,
  groupEvidencesByIncident,
  isChecksumVerifyValid,
  sumEvidenceBytes,
} from "../evidence-utils";
import type { EvidenceItem, IncidentItem } from "@/types";

function makeEvidence(overrides: Partial<EvidenceItem> = {}): EvidenceItem {
  return {
    id: "ev-1",
    incidentId: "inc-1",
    cameraId: "cam-1",
    evidenceType: "SNAPSHOT",
    storageKey: "evidences/site1/cam1/inc1/snap.jpg",
    fileName: "snap_01.jpg",
    mimeType: "image/jpeg",
    fileSize: 204800,
    capturedAt: "2026-11-17T08:00:00.000Z",
    createdAt: "2026-11-17T08:00:01.000Z",
    metadata: {
      id: "meta-1",
      evidenceId: "ev-1",
      width: 1920,
      height: 1080,
      checksum: "abc123def456",
      createdAt: "2026-11-17T08:00:01.000Z",
    },
    ...overrides,
  };
}

test("isChecksumVerifyValid handles both BE isValid and legacy isTampered contracts", () => {
  assert.equal(
    isChecksumVerifyValid({
      expectedChecksum: "aaa",
      actualChecksum: "aaa",
      verifiedAt: "2026-11-17T08:00:00Z",
      isValid: true,
    }),
    true,
  );
  assert.equal(
    isChecksumVerifyValid({
      expectedChecksum: "aaa",
      actualChecksum: "bbb",
      verifiedAt: "2026-11-17T08:00:00Z",
      isValid: false,
    }),
    false,
  );
  assert.equal(
    isChecksumVerifyValid({
      expectedChecksum: "aaa",
      actualChecksum: "bbb",
      verifiedAt: "2026-11-17T08:00:00Z",
      isTampered: true,
    }),
    false,
  );
  assert.equal(isChecksumVerifyValid(null), false);
});

test("extractEvidenceBoundingBoxes normalizes [0..1] coords and deduplicates", () => {
  const ev = makeEvidence({
    metadata: {
      id: "m1",
      evidenceId: "ev-1",
      createdAt: "2026-11-17T08:00:00Z",
      aiDetections: {
        persons: [
          {
            box: { x: 0.1, y: 0.1, width: 0.2, height: 0.5 },
            confidence: 0.9,
            violations: [
              {
                type: "NO_HELMET",
                confidence: 0.95,
                box: { x: 0.25, y: 0.2, width: 0.15, height: 0.3 },
              },
              {
                type: "NO_HELMET",
                confidence: 0.95,
                box: { x: 0.25, y: 0.2, width: 0.15, height: 0.3 },
              },
            ],
          },
        ],
      },
    },
  });

  const boxes = extractEvidenceBoundingBoxes(ev);
  assert.equal(boxes.length, 1);
  assert.equal(boxes[0].x, 25);
  assert.equal(boxes[0].y, 20);
  assert.equal(boxes[0].width, 15);
  assert.equal(boxes[0].height, 30);
  assert.equal(boxes[0].label, "NO_HELMET");
});

test("groupEvidencesByIncident pairs reference and snapshot per incident", () => {
  const snap = makeEvidence({
    id: "ev-snap",
    incidentId: "inc-1",
    evidenceType: "SNAPSHOT",
    capturedAt: "2026-11-17T09:00:00.000Z",
  });
  const ref = makeEvidence({
    id: "ev-ref",
    incidentId: "inc-1",
    evidenceType: "REFERENCE_SNAPSHOT",
    fileName: "ref.jpg",
    capturedAt: "2026-11-17T08:59:50.000Z",
  });
  const clip = makeEvidence({
    id: "ev-clip",
    incidentId: "inc-2",
    evidenceType: "VIDEO_CLIP",
    fileName: "clip.mp4",
    mimeType: "video/mp4",
    capturedAt: "2026-11-17T10:00:00.000Z",
  });

  const groups = groupEvidencesByIncident([snap, ref, clip]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].incidentId, "inc-2");
  assert.equal(groups[0].videos.length, 1);
  assert.equal(groups[1].incidentId, "inc-1");
  assert.equal(groups[1].snapshot?.id, "ev-snap");
  assert.equal(groups[1].reference?.id, "ev-ref");
});

test("filterEvidencesClientSide filters by site, violation, checksum, date preset, and search", () => {
  const nowMs = Date.parse("2026-11-17T12:00:00.000Z");
  const incidentsMap = new Map<string, IncidentItem>([
    [
      "inc-1",
      {
        id: "inc-1",
        siteId: "site-a",
        cameraId: "cam-1",
        violationType: "NO_HELMET",
        severity: "CRITICAL",
        status: "PENDING_REVIEW",
        detectedAt: "2026-11-17T10:00:00.000Z",
        createdAt: "2026-11-17T10:00:00.000Z",
        updatedAt: "2026-11-17T10:00:00.000Z",
      },
    ],
    [
      "inc-2",
      {
        id: "inc-2",
        siteId: "site-b",
        cameraId: "cam-2",
        violationType: "NO_VEST",
        severity: "LOW",
        status: "RESOLVED",
        detectedAt: "2026-10-01T10:00:00.000Z",
        createdAt: "2026-10-01T10:00:00.000Z",
        updatedAt: "2026-10-01T10:00:00.000Z",
      },
    ],
  ]);

  const items = [
    makeEvidence({
      id: "ev-1",
      incidentId: "inc-1",
      cameraId: "cam-1",
      fileName: "gate_north_helmet.jpg",
      capturedAt: "2026-11-17T10:00:00.000Z",
    }),
    makeEvidence({
      id: "ev-2",
      incidentId: "inc-2",
      cameraId: "cam-2",
      fileName: "old_vest.jpg",
      capturedAt: "2026-10-01T10:00:00.000Z",
      metadata: null,
    }),
  ];

  const filtered = filterEvidencesClientSide(
    items,
    {
      siteId: "site-a",
      violationType: "NO_HELMET",
      checksumFilter: "has_hash",
      datePreset: "today",
      search: "north",
    },
    {
      incidentsMap,
      nowMs,
      getCameraLabel: () => "CAM-01",
    },
  );
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, "ev-1");

  const missingHash = filterEvidencesClientSide(
    items,
    { checksumFilter: "missing_hash" },
    { incidentsMap, nowMs },
  );
  assert.equal(missingHash.length, 1);
  assert.equal(missingHash[0].id, "ev-2");
});

test("formatEvidenceFileSize and formatMediaDuration format edge cases cleanly", () => {
  assert.equal(formatEvidenceFileSize(512), "512 B");
  assert.equal(formatEvidenceFileSize(2048), "2.0 KB");
  assert.equal(formatEvidenceFileSize(2 * 1024 * 1024), "2.00 MB");
  assert.equal(formatEvidenceFileSize(0), "--");
  assert.equal(formatMediaDuration(75), "01:15");
  assert.equal(formatMediaDuration(null), "--");
});

test("filterEvidencesClientSide handles lifecycleScope, archivedIds, and sumEvidenceBytes", () => {
  const incidentsMap = new Map<string, IncidentItem>([
    [
      "inc-active",
      {
        id: "inc-active",
        siteId: "site-a",
        cameraId: "cam-1",
        violationType: "NO_HELMET",
        severity: "HIGH",
        status: "CONFIRMED",
        detectedAt: "2026-11-17T10:00:00.000Z",
        createdAt: "2026-11-17T10:00:00.000Z",
        updatedAt: "2026-11-17T10:00:00.000Z",
      },
    ],
    [
      "inc-dismissed",
      {
        id: "inc-dismissed",
        siteId: "site-a",
        cameraId: "cam-1",
        violationType: "NO_VEST",
        severity: "LOW",
        status: "DISMISSED",
        detectedAt: "2026-11-17T10:00:00.000Z",
        createdAt: "2026-11-17T10:00:00.000Z",
        updatedAt: "2026-11-17T10:00:00.000Z",
      },
    ],
    [
      "inc-closed",
      {
        id: "inc-closed",
        siteId: "site-a",
        cameraId: "cam-1",
        violationType: "NO_HELMET",
        severity: "MEDIUM",
        status: "CLOSED",
        detectedAt: "2026-11-17T10:00:00.000Z",
        createdAt: "2026-11-17T10:00:00.000Z",
        updatedAt: "2026-11-17T10:00:00.000Z",
      },
    ],
  ]);

  const items = [
    makeEvidence({ id: "ev-active", incidentId: "inc-active", fileSize: 1000 }),
    makeEvidence({ id: "ev-dismissed", incidentId: "inc-dismissed", fileSize: "2500" }),
    makeEvidence({ id: "ev-closed", incidentId: "inc-closed", fileSize: 500 }),
  ];

  assert.equal(sumEvidenceBytes(items), 4000);

  const archivedIds = new Set(["ev-closed"]);

  // Main vault hides archived items automatically
  const allVisible = filterEvidencesClientSide(
    items,
    { lifecycleScope: "all", archivedIds },
    { incidentsMap },
  );
  assert.deepEqual(
    allVisible.map((i) => i.id),
    ["ev-active", "ev-dismissed"],
  );

  // Dismissed scope
  const dismissedOnly = filterEvidencesClientSide(
    items,
    { lifecycleScope: "dismissed", archivedIds },
    { incidentsMap },
  );
  assert.deepEqual(
    dismissedOnly.map((i) => i.id),
    ["ev-dismissed"],
  );

  // Archived scope
  const archivedOnly = filterEvidencesClientSide(
    items,
    { lifecycleScope: "archived", archivedIds },
    { incidentsMap },
  );
  assert.deepEqual(
    archivedOnly.map((i) => i.id),
    ["ev-closed"],
  );
});
