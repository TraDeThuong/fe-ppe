import "@/hooks/auth/__tests__/setup";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { releaseActionLock, tryAcquireActionLock } from "../login-action-lock";

describe("login-action-lock", () => {
  it("prevents concurrent invocations within the same tick before React state re-renders", () => {
    const lockRef = { current: false };

    const firstAttempt = tryAcquireActionLock(lockRef, false);
    const rapidSecondAttempt = tryAcquireActionLock(lockRef, false);

    assert.equal(firstAttempt, true);
    assert.equal(rapidSecondAttempt, false);
    assert.equal(lockRef.current, true);
  });

  it("refuses to acquire lock when caller condition is blocked", () => {
    const lockRef = { current: false };

    assert.equal(tryAcquireActionLock(lockRef, true), false);
    assert.equal(lockRef.current, false);
  });

  it("allows retry after releaseActionLock is called on failure", () => {
    const lockRef = { current: false };

    assert.equal(tryAcquireActionLock(lockRef, false), true);
    releaseActionLock(lockRef);
    assert.equal(lockRef.current, false);
    assert.equal(tryAcquireActionLock(lockRef, false), true);
  });
});

