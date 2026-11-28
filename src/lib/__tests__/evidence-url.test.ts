import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSignedInternalMinioUrl, resolveEvidenceUrl } from "../evidence-url";

const SIGNED =
  "http://ppe-minio:9000/ppe-evidences/a.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-SignedHeaders=host&X-Amz-Signature=abc";

describe("evidence-url", () => {
  it("nhận diện URL presigned ký cho host nội bộ", () => {
    assert.equal(isSignedInternalMinioUrl(SIGNED), true);
    assert.equal(isSignedInternalMinioUrl("http://ppe-minio:9000/ppe-evidences/a.jpg"), false);
    assert.equal(
      isSignedInternalMinioUrl("http://localhost:9000/ppe-evidences/a.jpg?X-Amz-Signature=abc"),
      false,
    );
  });

  it("vẫn đổi host nội bộ sang localhost và chỉ cảnh báo một lần", () => {
    const original = console.warn;
    const warnings: unknown[] = [];
    console.warn = (...args: unknown[]) => warnings.push(args);
    try {
      assert.ok(resolveEvidenceUrl(SIGNED).startsWith("http://localhost:9000/"));
      resolveEvidenceUrl(SIGNED);
    } finally {
      console.warn = original;
    }
    assert.equal(warnings.length, 1);
  });
});
