import "@/hooks/auth/__tests__/setup";
import assert from "node:assert/strict";
import { it } from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { cameraService } from "@/services/camera.service";
import { renderAuthHook } from "@/hooks/auth/__tests__/test-helpers";
import { cameraKeys } from "@/hooks/cameras/camera.query-keys";
import type { SiteItem } from "@/types";
import { useSitesWithCameraCounts } from "../use-sites-with-camera-counts";

const site: SiteItem = {
  id: "site-1",
  name: "Site 1",
  code: "SITE-1",
  status: "ACTIVE",
  createdAt: "2026-11-01T00:00:00Z",
  updatedAt: "2026-11-01T00:00:00Z",
};

it("uses the last successful camera counts for both site collections after a refetch error", async (t) => {
  const rawSites = [site];
  const rawCatalog = [
    { ...site, cameraCount: 8 },
    { ...site, id: "site-2", cameraCount: 3 },
  ];
  const queryClient = new QueryClient();
  const queryKey = cameraKeys.countsBySite(["site-1", "site-2"]);
  t.after(() => queryClient.clear());
  let offline = true;
  let counts = [{ siteId: "site-1", total: 5, online: 3, offline: 2, error: 0 }];
  t.mock.method(cameraService, "getCountsBySite", async () => {
    if (offline) throw new Error("Camera service unavailable");
    return counts;
  });

  const read = (canReadCameras = true) =>
    renderAuthHook(
      () => useSitesWithCameraCounts(rawSites, rawCatalog, canReadCameras),
      { queryClient },
    ).result.current;

  const initial = read();
  assert.deepEqual(initial.sites.map((site) => site.cameraCount), [undefined]);
  assert.deepEqual(initial.sitesCatalog.map((site) => site.cameraCount), [8, 3]);
  assert.ok(initial.refetch);
  await initial.refetch();
  assert.equal(queryClient.getQueryState(queryKey)?.status, "error");
  assert.equal(queryClient.getQueryData(queryKey), undefined);
  assert.deepEqual(read().sites.map((site) => site.cameraCount), [undefined]);
  assert.deepEqual(read().sitesCatalog.map((site) => site.cameraCount), [8, 3]);

  offline = false;
  await initial.refetch();
  assert.equal(queryClient.getQueryState(queryKey)?.status, "success");
  assert.deepEqual(read().sites.map((site) => site.cameraCount), [5]);
  assert.deepEqual(read().sitesCatalog.map((site) => site.cameraCount), [5, 0]);

  offline = true;
  await initial.refetch();
  assert.equal(queryClient.getQueryState(queryKey)?.status, "error");
  assert.deepEqual(queryClient.getQueryData(queryKey), counts);
  const afterError = read();
  assert.deepEqual(afterError.sites.map((site) => site.cameraCount), [5]);
  assert.deepEqual(afterError.sitesCatalog.map((site) => site.cameraCount), [5, 0]);

  const withoutPermission = read(false);
  assert.equal(withoutPermission.refetch, undefined);
  assert.equal(withoutPermission.sites, rawSites);
  assert.equal(withoutPermission.sitesCatalog, rawCatalog);

  offline = false;
  counts = [];
  await initial.refetch();
  assert.equal(queryClient.getQueryState(queryKey)?.status, "success");
  const afterRecovery = read();
  assert.deepEqual(afterRecovery.sites.map((site) => site.cameraCount), [0]);
  assert.deepEqual(afterRecovery.sitesCatalog.map((site) => site.cameraCount), [0, 0]);
});
