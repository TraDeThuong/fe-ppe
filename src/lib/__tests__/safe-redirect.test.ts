import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeNextPath } from "../safe-redirect";

const ORIGIN = "http://localhost:3000";

describe("sanitizeNextPath", () => {
  it("giữ path nội bộ kèm query và hash", () => {
    assert.equal(sanitizeNextPath("/incidents?status=OPEN#top", ORIGIN), "/incidents?status=OPEN#top");
    assert.equal(sanitizeNextPath("/dashboard", ORIGIN), "/dashboard");
  });

  it("chặn URL tuyệt đối và protocol-relative", () => {
    assert.equal(sanitizeNextPath("https://evil.com", ORIGIN), "/");
    assert.equal(sanitizeNextPath("//evil.com", ORIGIN), "/");
    assert.equal(sanitizeNextPath("javascript:alert(1)", ORIGIN), "/");
  });

  it("chặn backslash và ký tự điều khiển (trình duyệt chuẩn hóa thành //)", () => {
    assert.equal(sanitizeNextPath("/\\evil.com", ORIGIN), "/");
    assert.equal(sanitizeNextPath("/\\/evil.com", ORIGIN), "/");
    assert.equal(sanitizeNextPath("/foo\\bar", ORIGIN), "/");
    assert.equal(sanitizeNextPath("/\t/evil.com", ORIGIN), "/");
    assert.equal(sanitizeNextPath("/\n/evil.com", ORIGIN), "/");
  });

  it("rỗng / null về trang gốc", () => {
    assert.equal(sanitizeNextPath(null, ORIGIN), "/");
    assert.equal(sanitizeNextPath("", ORIGIN), "/");
    assert.equal(sanitizeNextPath("dashboard", ORIGIN), "/");
  });
});
