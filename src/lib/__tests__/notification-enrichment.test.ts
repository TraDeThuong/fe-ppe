import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildIncidentSignalMap,
  computeBoxCenterDistance,
  computeBoxIoU,
  extractSignalsFromIncident,
  extractTrackIdFromStorageKey,
} from "../notification-enrichment";
import type { IncidentItem } from "@/types";

describe("notification-enrichment", () => {
  it("extracts personTrackId by matching highest IoU between violation.box and PERSON detections", () => {
    const incident: IncidentItem = {
      id: "inc-1",
      siteId: "site-1",
      cameraId: "cam-1",
      violationType: "NO_HELMET",
      severity: "HIGH",
      status: "PENDING_REVIEW",
      detectedAt: "2026-11-22T09:00:02.000Z",
      createdAt: "2026-11-22T09:00:02.000Z",
      updatedAt: "2026-11-22T09:00:02.000Z",
      evidences: [
        {
          id: "ev-1",
          incidentId: "inc-1",
          cameraId: "cam-1",
          evidenceType: "SNAPSHOT",
          storageKey: "evidences/site-1/CAM-01/20261122_track99_abc.jpg",
          fileName: "20261122_track99_abc.jpg",
          mimeType: "image/jpeg",
          fileSize: 12000,
          capturedAt: "2026-11-22T09:00:02.000Z",
          createdAt: "2026-11-22T09:00:02.000Z",
          metadata: {
            id: "meta-1",
            evidenceId: "ev-1",
            width: 1280,
            height: 720,
            checksum: "abc123",
            createdAt: "2026-11-22T09:00:02.000Z",
            aiDetections: {
              violation: {
                type: "NO_HELMET",
                confidence: 0.91,
                box: { x: 0.2, y: 0.2, width: 0.2, height: 0.5 },
              },
              allDetections: [
                {
                  class: "PERSON",
                  track_id: 3,
                  confidence: 0.9,
                  box: { x: 0.7, y: 0.2, width: 0.15, height: 0.45 },
                },
                {
                  class: "PERSON",
                  track_id: 7,
                  confidence: 0.95,
                  box: { x: 0.21, y: 0.2, width: 0.19, height: 0.5 },
                },
              ],
            } as unknown as IncidentItem["evidences"] extends Array<infer E>
              ? E extends { metadata?: { aiDetections?: infer A } | null }
                ? A
                : never
              : never,
          },
        },
      ],
    };

    const signals = extractSignalsFromIncident(incident);
    assert.equal(signals.personTrackId, 7);
    assert.equal(signals.evidenceChecksum, "abc123");
    assert.ok(signals.personBox);
    assert.equal(signals.personBox.x, 0.2);
  });

  it("falls back to parsing _track<N> from MinIO storageKey when aiDetections has no track_id", () => {
    assert.equal(
      extractTrackIdFromStorageKey("evidences/s1/CAM-01/20261122T0900_track14_evt1.jpg"),
      14,
    );
    assert.equal(extractTrackIdFromStorageKey("evidences/s1/CAM-01/plain.jpg"), null);

    const map = buildIncidentSignalMap([
      {
        id: "inc-2",
        siteId: "site-1",
        cameraId: "cam-1",
        violationType: "NO_VEST",
        severity: "MEDIUM",
        status: "PENDING_REVIEW",
        detectedAt: "2026-11-22T09:00:04.000Z",
        createdAt: "2026-11-22T09:00:04.000Z",
        updatedAt: "2026-11-22T09:00:04.000Z",
        evidences: [
          {
            id: "ev-2",
            incidentId: "inc-2",
            cameraId: "cam-1",
            evidenceType: "SNAPSHOT",
            storageKey: "evidences/site-1/CAM-01/20261122_track14_xyz.jpg",
            fileName: "20261122_track14_xyz.jpg",
            mimeType: "image/jpeg",
            fileSize: 9000,
            capturedAt: "2026-11-22T09:00:04.000Z",
            createdAt: "2026-11-22T09:00:04.000Z",
          },
        ],
      },
    ]);

    assert.equal(map.get("inc-2")?.personTrackId, 14);
  });

  it("computes IoU and center distance accurately", () => {
    const a = { x: 0.1, y: 0.1, width: 0.2, height: 0.4 };
    const same = { x: 0.1, y: 0.1, width: 0.2, height: 0.4 };
    const shifted = { x: 0.12, y: 0.1, width: 0.2, height: 0.4 };
    const far = { x: 0.7, y: 0.1, width: 0.2, height: 0.4 };

    assert.equal(computeBoxIoU(a, same), 1);
    assert.ok(computeBoxIoU(a, shifted) > 0.75);
    assert.equal(computeBoxIoU(a, far), 0);
    assert.ok(computeBoxCenterDistance(a, shifted) < 0.03);
    assert.ok(computeBoxCenterDistance(a, far) > 0.5);
  });
});
