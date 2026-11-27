import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  groupNotificationsByPerson,
  groupNotificationsIntoSections,
} from "../notification-grouping-engine";
import type { NotificationEnrichedSignals } from "../notification-enrichment";
import type { NotificationItemDto } from "@/types";

function makeNotif(
  id: string,
  incidentId: string | null,
  extra: Partial<NotificationItemDto> = {},
): NotificationItemDto {
  return {
    id,
    userId: "u-1",
    incidentId,
    templateId: null,
    channel: "IN_APP",
    title: "Cảnh báo vi phạm PPE [HIGH]: NO_HELMET tại Công trường A",
    content: "Phát hiện vi phạm NO_HELMET tại vị trí camera CAM-01.",
    severity: "HIGH",
    status: "SENT",
    isRead: false,
    sentAt: "2026-11-22T09:00:02.000Z",
    readAt: null,
    createdAt: "2026-11-22T09:00:02.000Z",
    ...extra,
  };
}

function makeSignal(
  incidentId: string,
  extra: Partial<NotificationEnrichedSignals> = {},
): NotificationEnrichedSignals {
  return {
    incidentId,
    cameraId: "cam-1",
    cameraCode: "CAM-01",
    siteId: "site-1",
    siteName: "Công trường A",
    detectedAtMs: Date.parse("2026-11-22T09:00:02.000Z"),
    violationType: "NO_HELMET",
    severity: "HIGH",
    status: "PENDING_REVIEW",
    personTrackId: 7,
    personBox: { x: 0.2, y: 0.2, width: 0.2, height: 0.5 },
    evidenceId: `ev-${incidentId}`,
    evidenceChecksum: `sum-${incidentId}`,
    evidenceUrl: `http://localhost:9000/ppe-evidences/${incidentId}.jpg`,
    ...extra,
  };
}

describe("notification-grouping-engine", () => {
  it("synthesizes NO_HELMET + NO_VEST of the SAME person (track_id #7) into 1 Multi-Violation cluster without merging a different person (#8)", () => {
    const nVest = makeNotif("n-vest", "inc-vest", {
      title: "Cảnh báo vi phạm PPE [MEDIUM]: NO_VEST tại Công trường A",
      content: "Không mặc áo phản quang tại vị trí camera CAM-01.",
      severity: "MEDIUM",
      createdAt: "2026-11-22T09:00:04.000Z",
      sentAt: "2026-11-22T09:00:04.000Z",
    });
    const nHelmet = makeNotif("n-helmet", "inc-helmet", {
      title: "Cảnh báo vi phạm PPE [HIGH]: NO_HELMET tại Công trường A",
      content: "Không đội mũ bảo hộ lao động tại vị trí camera CAM-01.",
      severity: "HIGH",
      createdAt: "2026-11-22T09:00:02.000Z",
      sentAt: "2026-11-22T09:00:02.000Z",
    });
    const nOtherPerson = makeNotif("n-other", "inc-other", {
      title: "Cảnh báo vi phạm PPE [HIGH]: NO_HELMET tại Công trường A",
      content: "Không đội mũ bảo hộ lao động tại vị trí camera CAM-01.",
      severity: "HIGH",
      createdAt: "2026-11-22T09:00:03.000Z",
      sentAt: "2026-11-22T09:00:03.000Z",
    });

    const signals = new Map<string, NotificationEnrichedSignals>([
      ["inc-vest", makeSignal("inc-vest", { violationType: "NO_VEST", personTrackId: 7, detectedAtMs: Date.parse("2026-11-22T09:00:04.000Z") })],
      ["inc-helmet", makeSignal("inc-helmet", { violationType: "NO_HELMET", personTrackId: 7, detectedAtMs: Date.parse("2026-11-22T09:00:02.000Z") })],
      ["inc-other", makeSignal("inc-other", { violationType: "NO_HELMET", personTrackId: 8, personBox: { x: 0.72, y: 0.2, width: 0.18, height: 0.48 }, detectedAtMs: Date.parse("2026-11-22T09:00:03.000Z") })],
    ]);

    const clusters = groupNotificationsByPerson([nVest, nOtherPerson, nHelmet], signals, {
      isVietnamese: true,
    });

    assert.equal(clusters.length, 2);
    const multiCluster = clusters.find((c) => c.trackId === 7)!;
    assert.equal(multiCluster.count, 2);
    assert.equal(multiCluster.isMultiViolation, true);
    assert.deepEqual(multiCluster.violationCodes.sort(), ["NO_HELMET", "NO_VEST"]);
    assert.equal(multiCluster.highestSeverity, "HIGH");
    assert.ok(multiCluster.matchReasons.includes("EXACT_TRACK"));

    const otherCluster = clusters.find((c) => c.trackId === 8)!;
    assert.equal(otherCluster.count, 1);
    assert.equal(otherCluster.isMultiViolation, false);
  });

  it("merges ByteTrack ID-switch alerts via SPATIAL_IOU when boxes overlap strongly", () => {
    const n1 = makeNotif("n-1", "inc-1", { sentAt: "2026-11-22T09:00:05.000Z", createdAt: "2026-11-22T09:00:05.000Z" });
    const n2 = makeNotif("n-2", "inc-2", { sentAt: "2026-11-22T09:00:02.000Z", createdAt: "2026-11-22T09:00:02.000Z" });

    const signals = new Map<string, NotificationEnrichedSignals>([
      ["inc-1", makeSignal("inc-1", { personTrackId: 15, personBox: { x: 0.21, y: 0.2, width: 0.2, height: 0.5 }, detectedAtMs: Date.parse("2026-11-22T09:00:05.000Z") })],
      ["inc-2", makeSignal("inc-2", { personTrackId: 7, personBox: { x: 0.2, y: 0.2, width: 0.2, height: 0.5 }, detectedAtMs: Date.parse("2026-11-22T09:00:02.000Z") })],
    ]);

    const clusters = groupNotificationsByPerson([n1, n2], signals);
    assert.equal(clusters.length, 1);
    assert.equal(clusters[0].count, 2);
    assert.ok(clusters[0].matchReasons.includes("SPATIAL_IOU"));
    assert.ok((clusters[0].bestSpatialIoUPct ?? 0) >= 85);
  });

  it("groups notifications into hourly and per-camera sections with breakdown stats", () => {
    const h1a = makeNotif("h1a", "inc-h1a", { sentAt: "2026-11-22T09:10:00.000Z", createdAt: "2026-11-22T09:10:00.000Z" });
    const h1b = makeNotif("h1b", "inc-h1b", {
      title: "Cảnh báo vi phạm PPE [MEDIUM]: NO_VEST tại Công trường A",
      content: "Không mặc áo phản quang tại vị trí camera CAM-02.",
      severity: "MEDIUM",
      sentAt: "2026-11-22T09:20:00.000Z",
      createdAt: "2026-11-22T09:20:00.000Z",
    });
    const h2 = makeNotif("h2", "inc-h2", {
      sentAt: "2026-11-22T07:15:00.000Z",
      createdAt: "2026-11-22T07:15:00.000Z",
      status: "READ",
      isRead: true,
    });

    const signals = new Map<string, NotificationEnrichedSignals>([
      ["inc-h1a", makeSignal("inc-h1a", { cameraId: "cam-1", cameraCode: "CAM-01", personTrackId: 1, detectedAtMs: Date.parse("2026-11-22T09:10:00.000Z") })],
      ["inc-h1b", makeSignal("inc-h1b", { cameraId: "cam-2", cameraCode: "CAM-02", violationType: "NO_VEST", personTrackId: 2, detectedAtMs: Date.parse("2026-11-22T09:20:00.000Z") })],
      ["inc-h2", makeSignal("inc-h2", { cameraId: "cam-1", cameraCode: "CAM-01", personTrackId: 3, detectedAtMs: Date.parse("2026-11-22T07:15:00.000Z") })],
    ]);

    const hourly = groupNotificationsIntoSections([h1b, h1a, h2], "hour", signals);
    assert.equal(hourly.length, 2);
    assert.equal(hourly[0].totalNotifications, 2);
    assert.equal(hourly[0].unreadCount, 2);
    assert.equal(hourly[1].totalNotifications, 1);
    assert.equal(hourly[1].unreadCount, 0);

    const byCamera = groupNotificationsIntoSections([h1b, h1a, h2], "camera", signals);
    assert.equal(byCamera.length, 2);
    assert.ok(byCamera.some((s) => s.title === "CAM-01" && s.totalNotifications === 2));
    assert.ok(byCamera.some((s) => s.title === "CAM-02" && s.totalNotifications === 1));
  });
});
