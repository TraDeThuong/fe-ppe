import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { userKeys } from "../user.query-keys";
import { siteKeys } from "../../sites/site.query-keys";

describe("User & Site Query Keys and Custom Hooks Test Suite", () => {
  it("generates correct query key for user summary", () => {
    const key = userKeys.summary();
    assert.deepEqual(key, ["users", "summary"]);
  });

  it("generates correct query key for user list and details", () => {
    const listKey = userKeys.list({ page: 1, limit: 10 });
    assert.deepEqual(listKey, ["users", "list", { page: 1, limit: 10 }]);

    const detailKey = userKeys.detail("user-123");
    assert.deepEqual(detailKey, ["users", "detail", "user-123"]);
  });

  it("verifies site query keys structure for invalidation after archive", () => {
    assert.deepEqual(siteKeys.all, ["sites"]);
    assert.deepEqual(siteKeys.lists(), ["sites", "list"]);
  });
});

