import { QueryClient } from "@tanstack/react-query";
import { notificationKeys } from "@/hooks/notifications/notification.query-keys";
import { test } from "node:test";
import assert from "node:assert/strict";
import { collectCatalog, settleInBatches, mapTableSort } from "../table-utils";

test("catalog collects more than 100 records using all metadata pages", async () => {
  const requested: number[] = [];
  const records = await collectCatalog(async (page, limit) => {
    requested.push(page);
    assert.equal(limit, 100);
    return { items: Array.from({ length: page === 3 ? 5 : 100 }, (_, i) => (page - 1) * 100 + i), meta: { totalPages: 3, total: 205 } };
  });
  assert.equal(records.length, 205); assert.deepEqual(requested, [1, 2, 3]); assert.equal(records[204], 204);
});
test("catalog rejects instead of exposing a partial list when a later page fails", async () => {
  await assert.rejects(collectCatalog(async page => {
    if (page === 2) throw new Error("offline");
    return { items: [1], meta: { totalPages: 2 } };
  }), /offline/);
});
test("bulk operations limit concurrency and retain the identities of failed rows", async () => {
  let active = 0; let max = 0;
  const result = await settleInBatches(["a", "b", "c", "d", "e"], async id => {
    active++; max = Math.max(max, active); await new Promise(resolve => setTimeout(resolve, 2)); active--; if (id === "b" || id === "e") throw new Error(id);
  });
  assert.equal(max, 3); assert.deepEqual(result.succeeded, ["a", "c", "d"]); assert.deepEqual(result.failed, ["b", "e"]);
});


test("display columns map to supported API fields, with safe endpoint defaults", () => {
  const fields = { user: "fullName", createdAt: "createdAt" } as const;
  const fallback = { sortBy: "createdAt", order: "desc" } as const;
  assert.deepEqual(mapTableSort([{ id: "user", desc: false }], fields, fallback), { sortBy: "fullName", order: "asc" });
  assert.deepEqual(mapTableSort([{ id: "role", desc: false }], fields, fallback), fallback);
  assert.deepEqual(mapTableSort([], fields, fallback), fallback);
  assert.deepEqual(mapTableSort([{ id: "toString", desc: false }], fields, fallback), fallback);
});


test("template mutations invalidate the full catalog as well as filtered lists", async () => {
  const client = new QueryClient();
  const catalog = notificationKeys.templates({ catalog: true });
  const filtered = notificationKeys.templates({ search: "helmet" });
  client.setQueryData(catalog, []); client.setQueryData(filtered, []);
  await client.invalidateQueries({ queryKey: notificationKeys.templates() });
  assert.equal(client.getQueryState(catalog)?.isInvalidated, true);
  assert.equal(client.getQueryState(filtered)?.isInvalidated, true);
  client.clear();
});
