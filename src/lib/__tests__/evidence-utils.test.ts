import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEvidenceServerFilters,
  escapeEvidenceCsvCell,
  extractEvidenceBoundingBoxes,
  formatEvidenceFileSize,
  formatMediaDuration,
  groupEvidencesByIncident,
  isChecksumVerifyValid,
  sumEvidenceBytes,
} from "../evidence-utils";
import type { EvidenceItem } from "@/types";

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

test("buildEvidenceServerFilters maps every page filter to the server-side query", () => {
  const nowMs = Date.parse("2026-11-17T12:00:30.500Z");
  assert.deepEqual(buildEvidenceServerFilters({}, nowMs), {});
  assert.deepEqual(
    buildEvidenceServerFilters(
      {
        search: "  north  ",
        siteId: "site-a",
        cameraId: "cam-1",
        evidenceType: "SNAPSHOT",
        violationType: "NO_HELMET",
        checksumFilter: "has_hash",
        datePreset: "7d",
        lifecycleScope: "dismissed",
      },
      nowMs,
    ),
    {
      search: "north",
      siteId: "site-a",
      cameraId: "cam-1",
      evidenceType: "SNAPSHOT",
      violationType: "NO_HELMET",
      hasChecksum: true,
      // làm tròn xuống đầu phút để query key ổn định
      fromDate: "2026-11-10T12:00:00.000Z",
      lifecycle: "DISMISSED",
    },
  );
  assert.equal(
    buildEvidenceServerFilters({ checksumFilter: "missing_hash" }, nowMs).hasChecksum,
    false,
  );
  assert.equal(buildEvidenceServerFilters({ lifecycleScope: "active" }).lifecycle, "ACTIVE");
  assert.equal(buildEvidenceServerFilters({ lifecycleScope: "closed" }).lifecycle, "CLOSED");
  assert.equal(buildEvidenceServerFilters({ search: "x".repeat(300) }).search?.length, 200);
});

test("escapeEvidenceCsvCell neutralises spreadsheet formulas (CWE-1236)", () => {
  assert.equal(escapeEvidenceCsvCell("=HYPERLINK(\"http://evil\")"), `"'=HYPERLINK(""http://evil"")"`);
  assert.equal(escapeEvidenceCsvCell("+cmd"), `"'+cmd"`);
  assert.equal(escapeEvidenceCsvCell("-2+3"), `"'-2+3"`);
  assert.equal(escapeEvidenceCsvCell("@SUM(A1)"), `"'@SUM(A1)"`);
  assert.equal(escapeEvidenceCsvCell("\tcam"), `"'\tcam"`);
  assert.equal(escapeEvidenceCsvCell("\rcam"), `"'\rcam"`);
  assert.equal(escapeEvidenceCsvCell("a,b"), `"a,b"`);
  assert.equal(escapeEvidenceCsvCell("snap.jpg"), "snap.jpg");
  assert.equal(escapeEvidenceCsvCell(1024), "1024");
  assert.equal(escapeEvidenceCsvCell(null), "");
});

test("formatEvidenceFileSize and formatMediaDuration format edge cases cleanly", () => {
  assert.equal(formatEvidenceFileSize(512), "512 B");
  assert.equal(formatEvidenceFileSize(2048), "2.0 KB");
  assert.equal(formatEvidenceFileSize(2 * 1024 * 1024), "2.00 MB");
  assert.equal(formatEvidenceFileSize(0), "--");
  assert.equal(formatMediaDuration(75), "01:15");
  assert.equal(formatMediaDuration(null), "--");
});

test("sumEvidenceBytes sums numeric and string file sizes", () => {
  const items = [
    makeEvidence({ id: "a", fileSize: 1000 }),
    makeEvidence({ id: "b", fileSize: "2500" }),
    makeEvidence({ id: "c", fileSize: 500 }),
  ];
  assert.equal(sumEvidenceBytes(items), 4000);
});
