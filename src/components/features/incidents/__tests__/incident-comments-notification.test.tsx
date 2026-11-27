if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:80/api/v1";
}
if (!process.env.NEXT_PUBLIC_APP_URL) {
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
}

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IncidentCommentsTimeline } from "../incident-comments-timeline";
import {
  classifyIncidentAlert,
  COMMENT_SIGNAL_PREFIX,
} from "@/lib/incident-workflow";
import { parseNotificationDisplay } from "@/lib/notification-display";
import { groupNotificationsByPerson } from "@/lib/notification-grouping-engine";
import { buildIncidentToastPayload } from "@/lib/incident-toast-payload";
import { WoodenIncidentToast } from "@ui/toaster";
import type { NotificationItemDto } from "@/types";

describe("Incident Field Comments Display & Notification Flow", () => {
  const incidentId = "0194e1e0-a43b-7341-9426-38290f6da867";
  const commentId = "0194e1e0-a43b-7341-9426-38290f6da999";
  const managerId = "0194e1e0-a43b-7341-9426-38290f6da001";
  const officerId = "0194e1e0-a43b-7341-9426-38290f6da002";

  it("classifies notification:incident_comment for all roles and suppresses self-authored alerts", () => {
    const payload = {
      incidentId,
      commentId,
      authorId: managerId,
      authorName: "Nguyễn Quản Lý",
      content: `${COMMENT_SIGNAL_PREFIX} Nguyễn Quản Lý: Nhờ kiểm tra ngay`,
      severity: "NORMAL",
    };

    const forOfficer = classifyIncidentAlert(
      payload,
      "notification:incident_comment",
      "SAFETY_OFFICER",
      officerId,
    );
    assert.strictEqual(forOfficer.kind, "INCIDENT_COMMENT");
    assert.strictEqual(forOfficer.shouldTriggerBellAndToast, true);
    assert.strictEqual(forOfficer.toastSeverity, "NORMAL");

    const forSelf = classifyIncidentAlert(
      payload,
      "notification:incident_comment",
      "SAFETY_MANAGER",
      managerId,
    );
    assert.strictEqual(forSelf.kind, "INCIDENT_COMMENT");
    assert.strictEqual(forSelf.shouldTriggerBellAndToast, false);
  });

  it("parses COMMENT notification cleanly, links to ?focus=comments, and does not merge into PPE clusters", () => {
    const commentNotif: NotificationItemDto = {
      id: "notif-comment-1",
      userId: officerId,
      incidentId,
      templateId: null,
      channel: "IN_APP",
      title: `Bình luận mới tại sự cố #${incidentId.slice(0, 8)} (Landmark 81)`,
      content: `${COMMENT_SIGNAL_PREFIX} Nguyễn Quản Lý: Công nhân đã khắc phục chưa em?`,
      severity: "NORMAL",
      status: "SENT",
      sentAt: "2026-11-22T10:05:00.000Z",
      readAt: null,
      createdAt: "2026-11-22T10:05:00.000Z",
    };

    const ppeNotif: NotificationItemDto = {
      id: "notif-ppe-1",
      userId: officerId,
      incidentId,
      templateId: null,
      channel: "IN_APP",
      title: "Cảnh báo vi phạm PPE [HIGH]: NO_HELMET tại Landmark 81",
      content: "Phát hiện vi phạm NO_HELMET tại vị trí camera CAM-01.",
      severity: "HIGH",
      status: "SENT",
      sentAt: "2026-11-22T10:04:50.000Z",
      readAt: null,
      createdAt: "2026-11-22T10:04:50.000Z",
    };

    const parsed = parseNotificationDisplay(commentNotif, true);
    assert.strictEqual(parsed.kind, "COMMENT");
    assert.strictEqual(parsed.commentAuthor, "Nguyễn Quản Lý");
    assert.strictEqual(parsed.commentText, "Công nhân đã khắc phục chưa em?");
    assert.strictEqual(parsed.cleanBody, "Công nhân đã khắc phục chưa em?");
    assert.strictEqual(parsed.incidentHref, `/incidents/${incidentId}?focus=comments`);

    const clusters = groupNotificationsByPerson([commentNotif, ppeNotif], undefined, {
      isVietnamese: true,
    });
    assert.strictEqual(clusters.length, 2);
  });

  it("builds INCIDENT_COMMENT toast payload and renders WoodenIncidentToast without compare button", () => {
    const built = buildIncidentToastPayload({
      alertData: {
        incidentId,
        commentId,
        authorName: "Nguyễn Quản Lý",
        comment: "Chụp lại ảnh xác nhận nhé",
        content: `${COMMENT_SIGNAL_PREFIX} Nguyễn Quản Lý: Chụp lại ảnh xác nhận nhé`,
        severity: "NORMAL",
        cameraCode: "CAM-02",
        siteName: "Landmark 81",
      },
      kind: "INCIDENT_COMMENT",
      severity: "NORMAL",
      isVietnamese: true,
    });

    assert.strictEqual(built.input.title, "Bình luận mới từ Nguyễn Quản Lý");
    assert.strictEqual(built.input.description, "Chụp lại ảnh xác nhận nhé");
    assert.strictEqual(built.incidentHref, `/incidents/${incidentId}?focus=comments`);
    assert.strictEqual(built.compareHref, null);
    assert.strictEqual(built.burstKey, `INCIDENT_COMMENT:${incidentId}`);

    const html = renderToStaticMarkup(
      <WoodenIncidentToast {...built.input} onOpen={() => {}} onDismiss={() => {}} />,
    );
    assert.ok(html.includes('data-incident-kind="INCIDENT_COMMENT"'));
    assert.ok(html.includes("Bình luận mới từ Nguyễn Quản Lý"));
    assert.ok(html.includes("Xem trao đổi"));
    assert.ok(!html.includes("Đối chiếu"));
  });

  it("renders real author names, role badges, self indicator, full date for older comments, and read-only/closed states", () => {
    const html = renderToStaticMarkup(
      <IncidentCommentsTimeline
        currentUserId={managerId}
        canComment
        isClosed={false}
        onSendComment={async () => {}}
        comments={[
          {
            id: "c1",
            incidentId,
            userId: managerId,
            userName: "Nguyễn Quản Lý",
            userRole: "SAFETY_MANAGER",
            comment: "Kiểm tra ngay khu vực A",
            createdAt: "2026-10-15T08:30:00.000Z",
          },
          {
            id: "c2",
            incidentId,
            userId: officerId,
            userName: "Trần An Toàn",
            userRole: "SAFETY_OFFICER",
            comment: "Em đang xuống hiện trường",
            createdAt: "2026-10-15T08:35:00.000Z",
          },
        ]}
      />,
    );

    assert.ok(html.includes("Nguyễn Quản Lý"));
    assert.ok(html.includes("Trần An Toàn"));
    assert.ok(html.includes("Bạn"));
    assert.ok(html.includes("Quản lý AT"));
    assert.ok(html.includes("Cán bộ AT"));
    assert.ok(html.includes("15/10/2026"));
    assert.ok(html.includes('id="incident-comments-section"'));

    const closedHtml = renderToStaticMarkup(
      <IncidentCommentsTimeline
        currentUserId={managerId}
        canComment
        isClosed
        onSendComment={async () => {}}
        comments={[]}
      />,
    );
    assert.ok(closedHtml.includes("Hồ sơ sự cố đã đóng"));
    assert.ok(!closedHtml.includes("<form"));

    const readOnlyHtml = renderToStaticMarkup(
      <IncidentCommentsTimeline
        currentUserId={officerId}
        canComment={false}
        isClosed={false}
        onSendComment={async () => {}}
        comments={[]}
      />,
    );
    assert.ok(readOnlyHtml.includes("chỉ có quyền xem"));
    assert.ok(!readOnlyHtml.includes("<form"));
  });
});
