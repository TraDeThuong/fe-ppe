import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clusterIncidentsByPerson,
  computeClusterStatusCounts,
  extractComponentViolationCodes,
  projectClusterToRepresentativeIncident,
} from "../incident-cluster-engine";
import type { IncidentItem } from "@/types";

function makeIncident(
  override: Partial<IncidentItem> & {
    trackId?: number | null;
    box?: { x: number; y: number; width: number; height: number } | null;
    aiViolations?: Array<{ type: string }>;
  } = {},
): IncidentItem {
  const { trackId, box, aiViolations, ...rest } = override;
  const hasEvidenceMeta =
    trackId !== undefined || box !== undefined || aiViolations !== undefined;

  return {
    id: "inc-1",
    siteId: "site-1",
    cameraId: "cam-1",
    cameraCode: "CAM-01",
    violationType: "NO_HELMET",
    severity: "HIGH",
    status: "PENDING_REVIEW",
    detectedAt: "2026-11-23T01:00:00.000Z",
    createdAt: "2026-11-23T01:00:00.000Z",
    updatedAt: "2026-11-23T01:00:00.000Z",
    ...(hasEvidenceMeta
      ? {
          evidences: [
            {
              id: `ev-${rest.id || "1"}`,
              incidentId: rest.id || "inc-1",
              cameraId: rest.cameraId || "cam-1",
              evidenceType: "SNAPSHOT",
              storageKey:
                trackId != null
                  ? `evidences/site-1/CAM-01/shot_track${trackId}.jpg`
                  : `evidences/site-1/CAM-01/shot.jpg`,
              fileName: "shot.jpg",
              mimeType: "image/jpeg",
              fileSize: 1024,
              capturedAt: rest.detectedAt || "2026-11-23T01:00:00.000Z",
              createdAt: rest.createdAt || "2026-11-23T01:00:00.000Z",
              metadata: {
                id: `meta-${rest.id || "1"}`,
                evidenceId: `ev-${rest.id || "1"}`,
                width: 1280,
                height: 720,
                createdAt: rest.createdAt || "2026-11-23T01:00:00.000Z",
                aiDetections: {
                  ...(box
                    ? {
                        violation: {
                          type: rest.violationType || "NO_HELMET",
                          box,
                          ...(trackId != null ? { track_id: trackId } : {}),
                        },
                      }
                    : trackId != null
                      ? { violation: { type: rest.violationType || "NO_HELMET", track_id: trackId } }
                      : {}),
                  ...(aiViolations ? { violations: aiViolations } : {}),
                } as unknown as NonNullable<
                  NonNullable<IncidentItem["evidences"]>[number]["metadata"]
                >["aiDetections"],
              },
            },
          ],
        }
      : {}),
    ...rest,
  };
}

describe("incident-cluster-engine", () => {
  it("groups NO_HELMET and NO_VEST of the same personTrackId within 45s into 1 MULTI_VIOLATION cluster", () => {
    const helmet = makeIncident({
      id: "inc-helmet",
      violationType: "NO_HELMET",
      severity: "HIGH",
      status: "CONFIRMED",
      detectedAt: "2026-11-23T01:00:00.000Z",
      trackId: 7,
    });
    const vest = makeIncident({
      id: "inc-vest",
      violationType: "NO_VEST",
      severity: "MEDIUM",
      status: "PENDING_REVIEW",
      detectedAt: "2026-11-23T01:00:03.000Z",
      trackId: 7,
    });

    const clusters = clusterIncidentsByPerson([helmet, vest]);
    assert.equal(clusters.length, 1);

    const cl = clusters[0];
    assert.equal(cl.rawCount, 2);
    assert.equal(cl.isMultiViolation, true);
    assert.equal(cl.effectiveViolationType, "MULTI_VIOLATION");
    assert.deepEqual([...cl.violationCodes].sort(), ["NO_HELMET", "NO_VEST"]);
    assert.equal(cl.effectiveSeverity, "HIGH");
    assert.equal(cl.effectiveStatus, "PENDING_REVIEW");
    assert.equal(cl.matchMethod, "EXACT_TRACK");
    assert.equal(cl.earliestDetectedAt, "2026-11-23T01:00:00.000Z");
    assert.equal(cl.latestDetectedAt, "2026-11-23T01:00:03.000Z");
    assert.equal(cl.effectiveResolvedAt, null);
  });

  it("groups ByteTrack ID-switch detections via SPATIAL_IOU within 15s", () => {
    const a = makeIncident({
      id: "inc-a",
      violationType: "NO_HELMET",
      detectedAt: "2026-11-23T02:00:00.000Z",
      trackId: 3,
      box: { x: 0.2, y: 0.2, width: 0.2, height: 0.4 },
    });
    const b = makeIncident({
      id: "inc-b",
      violationType: "NO_VEST",
      detectedAt: "2026-11-23T02:00:05.000Z",
      trackId: 9,
      box: { x: 0.21, y: 0.21, width: 0.2, height: 0.4 },
    });

    const clusters = clusterIncidentsByPerson([a, b]);
    assert.equal(clusters.length, 1);
    assert.equal(clusters[0].matchMethod, "SPATIAL_IOU");
    assert.equal(clusters[0].effectiveViolationType, "MULTI_VIOLATION");
    assert.ok((clusters[0].bestSpatialIoUPct ?? 0) >= 70);
  });

  it("does NOT merge incidents without trackId/box or across different cameras or outside time window", () => {
    const noSignal1 = makeIncident({ id: "ns-1", violationType: "NO_HELMET" });
    const noSignal2 = makeIncident({ id: "ns-2", violationType: "NO_VEST" });
    const diffCam = makeIncident({ id: "dc-1", cameraId: "cam-2", trackId: 7 });
    const sameCamLate = makeIncident({
      id: "late-1",
      cameraId: "cam-1",
      trackId: 7,
      detectedAt: "2026-11-23T01:05:00.000Z",
    });
    const sameCamEarly = makeIncident({
      id: "early-1",
      cameraId: "cam-1",
      trackId: 7,
      detectedAt: "2026-11-23T01:00:00.000Z",
    });

    assert.equal(clusterIncidentsByPerson([noSignal1, noSignal2]).length, 2);
    assert.equal(clusterIncidentsByPerson([sameCamEarly, diffCam]).length, 2);
    assert.equal(clusterIncidentsByPerson([sameCamEarly, sameCamLate]).length, 2);
  });

  it("computes effectiveResolvedAt = max(resolvedAt) only when all non-dismissed members are resolved/closed", () => {
    const a = makeIncident({
      id: "r-1",
      violationType: "NO_HELMET",
      status: "RESOLVED",
      detectedAt: "2026-11-23T01:00:00.000Z",
      resolvedAt: "2026-11-23T01:10:00.000Z",
      trackId: 12,
    });
    const b = makeIncident({
      id: "r-2",
      violationType: "NO_VEST",
      status: "CLOSED",
      detectedAt: "2026-11-23T01:00:02.000Z",
      resolvedAt: "2026-11-23T01:25:00.000Z",
      trackId: 12,
    });

    const clusters = clusterIncidentsByPerson([a, b]);
    assert.equal(clusters.length, 1);
    assert.equal(clusters[0].effectiveStatus, "RESOLVED");
    assert.equal(clusters[0].effectiveResolvedAt, "2026-11-23T01:25:00.000Z");

    const rep = projectClusterToRepresentativeIncident(clusters[0]);
    assert.equal(rep.violationType, "MULTI_VIOLATION");
    assert.equal(rep.detectedAt, "2026-11-23T01:00:00.000Z");
    assert.equal(rep.resolvedAt, "2026-11-23T01:25:00.000Z");
  });

  it("supports forward-compatible backend MULTI_VIOLATION records with aiDetections.violations[]", () => {
    const beMulti = makeIncident({
      id: "be-multi",
      violationType: "MULTI_VIOLATION",
      severity: "CRITICAL",
      aiViolations: [{ type: "NO_HELMET" }, { type: "NO_VEST" }],
    });

    assert.deepEqual(extractComponentViolationCodes(beMulti).sort(), [
      "NO_HELMET",
      "NO_VEST",
    ]);
    const clusters = clusterIncidentsByPerson([beMulti]);
    assert.equal(clusters.length, 1);
    assert.equal(clusters[0].isMultiViolation, true);
    assert.equal(clusters[0].effectiveViolationType, "MULTI_VIOLATION");
    assert.deepEqual(clusters[0].violationCodes.sort(), ["NO_HELMET", "NO_VEST"]);
  });

  it("computes cluster status counts accurately", () => {
    const clusters = clusterIncidentsByPerson([
      makeIncident({ id: "1", violationType: "NO_HELMET", severity: "CRITICAL", status: "PENDING_REVIEW", trackId: 1 }),
      makeIncident({ id: "2", violationType: "NO_VEST", severity: "MEDIUM", status: "CONFIRMED", trackId: 1 }),
      makeIncident({ id: "3", violationType: "NO_HELMET", severity: "HIGH", status: "RESOLVED", trackId: 2 }),
    ]);

    const counts = computeClusterStatusCounts(clusters);
    assert.equal(counts.total, 2);
    assert.equal(counts.rawTotal, 3);
    assert.equal(counts.pendingReview, 1);
    assert.equal(counts.resolved, 1);
    assert.equal(counts.critical, 1);
    assert.equal(counts.multiViolation, 1);
  });
});
