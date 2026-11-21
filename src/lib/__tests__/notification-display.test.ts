import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BROADCAST_USER_ID } from "../notification-inbox";
import {
  formatViolationTypeLabel,
  parseNotificationDisplay,
} from "../notification-display";
import type { NotificationItemDto } from "@/types";

function makeNotification(
  overrides: Partial<NotificationItemDto> = {},
): NotificationItemDto {
  return {
    id: "n-1",
    userId: "u-1",
    incidentId: null,
    templateId: null,
    channel: "IN_APP",
    title: "Thông báo hệ thống",
    content: "Nội dung thông báo",
    severity: "NORMAL",
    status: "SENT",
    sentAt: "2026-11-20T10:00:00Z",
    readAt: null,
    createdAt: "2026-11-20T10:00:00Z",
    ...overrides,
  };
}

describe("notification-display", () => {
  it("translates PPE violation codes to Vietnamese and English labels", () => {
    assert.equal(formatViolationTypeLabel("NO_HELMET", true), "Không đội mũ bảo hộ");
    assert.equal(formatViolationTypeLabel("no_vest", false), "No Safety Vest");
    assert.equal(formatViolationTypeLabel("RESTRICTED_AREA", true), "Xâm nhập vùng cấm");
  });

  it("extracts site, camera, and clean title/body from PPE alert notifications", () => {
    const item = makeNotification({
      incidentId: "inc-123",
      severity: "CRITICAL",
      title: "🚨 Cảnh báo vi phạm PPE [CRITICAL]: NO_HELMET tại Landmark Tower",
      content:
        "Phát hiện vi phạm NO_HELMET tại vị trí camera CAM-02. Mức độ: CRITICAL. Vui lòng kiểm tra và xử lý ngay.",
    });

    const parsed = parseNotificationDisplay(item, true);
    assert.equal(parsed.kind, "PPE_ALERT");
    assert.equal(parsed.violationCode, "NO_HELMET");
    assert.equal(parsed.violationLabel, "Không đội mũ bảo hộ");
    assert.equal(parsed.cameraCode, "CAM-02");
    assert.equal(parsed.siteName, "Landmark Tower");
    assert.equal(parsed.cleanTitle.includes("[CRITICAL]"), false);
    assert.ok(parsed.cleanTitle.includes("Không đội mũ bảo hộ"));
    assert.equal(parsed.cleanBody.includes("Mức độ: CRITICAL"), false);
    assert.equal(parsed.incidentHref, "/incidents/inc-123");
  });

  it("extracts dispatch directive note and group link metadata", () => {
    const groupPayload = Buffer.from(
      JSON.stringify({
        v: 1,
        groupId: "11111111-1111-4111-8111-111111111111",
        incidentIds: [
          "22222222-2222-4222-8222-222222222222",
          "33333333-3333-4333-8333-333333333333",
        ],
        assignedBy: "44444444-4444-4444-8444-444444444444",
        assignedTo: "55555555-5555-4555-8555-555555555555",
        createdAt: "2026-11-20T10:00:00.000Z",
      }),
    )
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const incidentId = "22222222-2222-4222-8222-222222222222";
    const item = makeNotification({
      incidentId,
      severity: "HIGH",
      title: "Điều phối xử lý vi phạm",
      content: `[ĐIỀU PHỐI] Quản lý (Trần Trà) đã giao 2 sự cố vi phạm tại CAM05 cho bạn kiểm tra và xử lý. — Chỉ đạo: Nhắc nhở tổ thi công tầng 4\nMở nhóm xử lý: https://app.local/incidents/${incidentId}?group=11111111-1111-4111-8111-111111111111&context=${groupPayload}`,
    });

    const parsed = parseNotificationDisplay(item, true);
    assert.equal(parsed.kind, "DISPATCH");
    assert.equal(parsed.cameraCode, "CAM05");
    assert.equal(parsed.directiveNote, "Nhắc nhở tổ thi công tầng 4");
    assert.equal(parsed.cleanBody.includes("[ĐIỀU PHỐI]"), false);
    assert.equal(parsed.cleanBody.includes("Mở nhóm xử lý:"), false);
    assert.equal(parsed.isGroupLink, true);
    assert.equal(parsed.groupCount, 2);
  });

  it("extracts resolution note for officer resolved reports and flags system broadcasts", () => {
    const resolved = parseNotificationDisplay(
      makeNotification({
        incidentId: "inc-9",
        content:
          "[BÁO CÁO ĐÃ KHẮC PHỤC] Nguyễn An đã xử lý xong sự cố tại CAM-09: Công nhân đã bổ sung nón bảo hộ",
      }),
      true,
    );
    assert.equal(resolved.kind, "RESOLVED");
    assert.equal(resolved.resolutionNote, "Công nhân đã bổ sung nón bảo hộ");
    assert.equal(resolved.cameraCode, "CAM-09");

    const broadcast = parseNotificationDisplay(
      makeNotification({
        userId: BROADCAST_USER_ID,
        title: "Bảo trì hệ thống",
        content: "Hệ thống sẽ bảo trì lúc 23:00.",
      }),
      true,
    );
    assert.equal(broadcast.kind, "BROADCAST");
    assert.equal(broadcast.isBroadcast, true);
  });
});
