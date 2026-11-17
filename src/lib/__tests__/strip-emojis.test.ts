import { describe, it } from "node:test";
import assert from "node:assert";
import { stripEmojis } from "../strip-emojis";

describe("stripEmojis", () => {
  it("removes leading and inline emojis from notification titles and content", () => {
    assert.strictEqual(
      stripEmojis("🚨 Cảnh báo vi phạm PPE [CRITICAL]: NO_HELMET tại Landmark"),
      "Cảnh báo vi phạm PPE [CRITICAL]: NO_HELMET tại Landmark",
    );
    assert.strictEqual(
      stripEmojis("📋 BẠN ĐƯỢC PHÂN CÔNG XỬ LÝ SỰ CỐ AN TOÀN ✅"),
      "BẠN ĐƯỢC PHÂN CÔNG XỬ LÝ SỰ CỐ AN TOÀN",
    );
    assert.strictEqual(
      stripEmojis("⚠️ Cảnh báo bảo mật\n🔑 Chi tiết: OK"),
      "Cảnh báo bảo mật\nChi tiết: OK",
    );
  });

  it("preserves Vietnamese diacritics, punctuation, and empty inputs", () => {
    assert.strictEqual(stripEmojis(""), "");
    assert.strictEqual(stripEmojis(null), "");
    assert.strictEqual(stripEmojis(undefined), "");
    assert.strictEqual(
      stripEmojis("Đội trưởng — Kiểm tra mũ bảo hộ (≥ 90%) tại Khu vực A."),
      "Đội trưởng — Kiểm tra mũ bảo hộ (≥ 90%) tại Khu vực A.",
    );
  });
});

