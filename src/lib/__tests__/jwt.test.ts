import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decodeJwtPayload, getJwtExpiryMs } from "../jwt";

function makeToken(payload: object): string {
  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.sig`;
}

describe("jwt", () => {
  it("đọc payload và exp (ms)", () => {
    const token = makeToken({ id: "u1", purpose: "2FA_VERIFICATION", exp: 1_800_000_000 });
    assert.deepEqual(decodeJwtPayload(token), {
      id: "u1",
      purpose: "2FA_VERIFICATION",
      exp: 1_800_000_000,
    });
    assert.equal(getJwtExpiryMs(token), 1_800_000_000_000);
  });

  it("đọc được payload có ký tự UTF-8/base64url", () => {
    const token = makeToken({ email: "a+b@x.vn", mustChangePassword: true, n: "ÿÿ?>" });
    assert.equal(decodeJwtPayload<{ mustChangePassword: boolean }>(token)?.mustChangePassword, true);
  });

  it("token hỏng hoặc thiếu exp → null", () => {
    assert.equal(decodeJwtPayload("abc"), null);
    assert.equal(decodeJwtPayload("a.!!!.c"), null);
    assert.equal(getJwtExpiryMs(makeToken({ id: "x" })), null);
    assert.equal(getJwtExpiryMs(null), null);
  });
});
