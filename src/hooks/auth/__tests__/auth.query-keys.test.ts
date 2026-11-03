import "./setup";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { authKeys } from "../auth.query-keys";

describe("authKeys query key factory", () => {
  it("generates correct root key", () => {
    assert.deepEqual(authKeys.all, ["auth"]);
  });

  it("generates correct me key", () => {
    assert.deepEqual(authKeys.me(), ["auth", "me"]);
  });

  it("generates correct sessions key", () => {
    assert.deepEqual(authKeys.sessions(), ["auth", "sessions"]);
  });

  it("generates correct social key", () => {
    assert.deepEqual(authKeys.social(), ["auth", "social"]);
  });

  it("generates correct config key", () => {
    assert.deepEqual(authKeys.config(), ["auth", "config"]);
  });

  it("generates correct googleUrl key with undefined params", () => {
    assert.deepEqual(authKeys.googleUrl(), ["auth", "google-url", undefined]);
  });

  it("generates correct googleUrl key with specific params", () => {
    const params = { redirectUri: "http://localhost:3000/callback" };
    assert.deepEqual(authKeys.googleUrl(params), ["auth", "google-url", params]);
  });
});
