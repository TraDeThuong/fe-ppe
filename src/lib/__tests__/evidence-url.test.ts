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

  it("không đổi host của URL đã ký (giữ chữ ký SigV4) và chỉ cảnh báo một lần", () => {
    const original = console.warn;
    const warnings: unknown[] = [];
    console.warn = (...args: unknown[]) => warnings.push(args);
    try {
      assert.equal(resolveEvidenceUrl(SIGNED), SIGNED);
      resolveEvidenceUrl(SIGNED);
    } finally {
      console.warn = original;
    }
    assert.equal(warnings.length, 1);
  });

  it("không có fallback localhost cứng cho storage key khi chưa cấu hình bucket công khai", () => {
    const prev = process.env.NEXT_PUBLIC_EVIDENCE_PUBLIC_BASE_URL;
    delete process.env.NEXT_PUBLIC_EVIDENCE_PUBLIC_BASE_URL;
    try {
      assert.equal(resolveEvidenceUrl("tenant/site/cam/snap.jpg"), "");
      assert.equal(
        resolveEvidenceUrl("http://ppe-minio:9000/ppe-evidences/a.jpg"),
        "http://ppe-minio:9000/ppe-evidences/a.jpg",
      );
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_EVIDENCE_PUBLIC_BASE_URL;
      else process.env.NEXT_PUBLIC_EVIDENCE_PUBLIC_BASE_URL = prev;
    }
  });

  it("ghép storage key và đổi host nội bộ (chưa ký) theo bucket công khai đã cấu hình", () => {
    const prev = process.env.NEXT_PUBLIC_EVIDENCE_PUBLIC_BASE_URL;
    process.env.NEXT_PUBLIC_EVIDENCE_PUBLIC_BASE_URL = "https://cdn.example.com/ppe-evidences/";
    try {
      assert.equal(
        resolveEvidenceUrl("/tenant/snap.jpg"),
        "https://cdn.example.com/ppe-evidences/tenant/snap.jpg",
      );
      assert.equal(
        resolveEvidenceUrl("http://ppe-minio:9000/ppe-evidences/a.jpg"),
        "https://cdn.example.com/ppe-evidences/a.jpg",
      );
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_EVIDENCE_PUBLIC_BASE_URL;
      else process.env.NEXT_PUBLIC_EVIDENCE_PUBLIC_BASE_URL = prev;
    }
  });
});
