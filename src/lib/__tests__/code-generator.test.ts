import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildExistingCodeSet,
  generateRandomToken,
  generateUniqueEntityCode,
  isCodeTaken,
  sanitizeManualCode,
  toAsciiSlug,
} from "../code-generator";

describe("code-generator", () => {
  it("normalizes Vietnamese text to clean ASCII slugs with '-' or '_'", () => {
    assert.equal(
      toAsciiSlug("Công trường Thủ Thiêm - Khu Đ1", "-"),
      "CONG-TRUONG-THU-THIEM-KHU-D1",
    );
    assert.equal(
      toAsciiSlug("Cảnh báo vùng cấm #1", "_"),
      "CANH_BAO_VUNG_CAM_1",
    );
  });

  it("generates readable random alphanumeric tokens without ambiguous 0/O/1/I characters", () => {
    for (let i = 0; i < 30; i++) {
      const token = generateRandomToken(6);
      assert.equal(token.length, 6);
      assert.match(token, /^[A-HJ-NP-Z2-9]{6}$/);
    }
  });

  it("checks code collisions case-insensitively", () => {
    const existing = ["CAM-NORTH-01", "site-landmark-81"];
    assert.equal(isCodeTaken("cam-north-01", existing), true);
    assert.equal(isCodeTaken("  SITE-LANDMARK-81 ", existing), true);
    assert.equal(isCodeTaken("CAM-SOUTH-02", existing), false);
    assert.equal(isCodeTaken("", existing), false);

    const set = buildExistingCodeSet(existing);
    assert.equal(isCodeTaken("cam-north-01", set), true);
  });

  it("sanitizes manual codes according to each BE microservice regex", () => {
    // 1. Standard (Site, Camera, Zone): /^[A-Z0-9_-]+$/i
    const std = sanitizeManualCode("  Cam Cổng Bắc #01 ", "standard");
    assert.equal(std, "CAM-CONG-BAC-01");
    assert.match(std, /^[A-Z0-9_-]+$/i);

    // 2. Dotted (ReportTemplate, AiModel): /^[A-Za-z0-9_.-]+$/
    const dotted = sanitizeManualCode(" yolo11.ppe v1 ", "dotted");
    assert.equal(dotted, "yolo11.ppe-v1");
    assert.match(dotted, /^[A-Za-z0-9_.-]+$/);

    // 3. Underscore uppercase (NotificationTemplate): /^[A-Z0-9_]+$/
    const tpl = sanitizeManualCode("cảnh-báo vùng cấm!", "underscore_upper");
    assert.equal(tpl, "CANH_BAO_VUNG_CAM");
    assert.match(tpl, /^[A-Z0-9_]+$/);
  });

  it("generates unique codes for Site, Camera, Zone, ReportTemplate, AiModel, and NotificationTemplate", () => {
    const existingCameras = new Set<string>(["CAM-GATE-01", "CAM-TEST-MP4"]);

    const camCode = generateUniqueEntityCode({
      prefix: "CAM",
      nameHint: "Camera Giàn Giáo Tầng 5",
      existingCodes: existingCameras,
    });
    assert.match(camCode, /^CAM-GIAN-GIAO-TANG-5-[A-Z0-9]{4}$/);
    assert.ok(camCode.length >= 2 && camCode.length <= 50);
    assert.equal(existingCameras.has(camCode), false);

    const siteCode = generateUniqueEntityCode({
      prefix: "SITE",
      nameHint: "Khu đô thị Landmark 81",
      existingCodes: ["SITE-KHU-DO-THI-LANDMARK"],
    });
    assert.match(siteCode, /^[A-Z0-9_-]{2,50}$/);

    const rptCode = generateUniqueEntityCode({
      prefix: "RPT",
      extraHint: "EXCEL",
      nameHint: "Báo cáo Tuân thủ Tháng",
      lowercase: true,
    });
    assert.match(rptCode, /^rpt-excel-[a-z0-9._-]+$/);
    assert.ok(rptCode.length <= 50);

    const aiModelCode = generateUniqueEntityCode({
      prefix: "MDL",
      nameHint: "YOLOv11 PPE Detector",
      lowercase: true,
    });
    assert.match(aiModelCode, /^mdl-yolov11-ppe-[a-z0-9._-]+$/);

    const notifTplCode = generateUniqueEntityCode({
      prefix: "TPL",
      extraHint: "IN_APP",
      nameHint: "Cảnh báo công nhân vào vùng cấm",
      separator: "_",
    });
    assert.match(notifTplCode, /^[A-Z0-9_]{2,50}$/);
    assert.ok(notifTplCode.startsWith("TPL_IN_APP_"));
  });
});
