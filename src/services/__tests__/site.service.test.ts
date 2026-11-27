import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { apiClient } from "@/lib/axios";
import { siteService } from "../site.service";

const originalAdapter = apiClient.defaults.adapter;
afterEach(() => { apiClient.defaults.adapter = originalAdapter; });

function respondWith(body: unknown) {
  apiClient.defaults.adapter = async (config) => ({ status: 200, statusText: "OK", headers: {}, config, data: body });
}

const listMeta = { page: 1, limit: 20, total: 1, totalPages: 1 };

describe("siteService camera count mapping", () => {
  it("keeps cameraCount undefined when /sites sends no camera field, so the card can show --", async () => {
    respondWith({
      success: true,
      data: [{ id: "s1", name: "Site A", code: "A", status: "ACTIVE", _count: { zones: 2, restrictedAreas: 1 } }],
      meta: listMeta,
    });
    const { items } = await siteService.getSites({ page: 1, limit: 20 });
    assert.equal(items.length, 1);
    assert.equal(items[0].cameraCount, undefined);
    assert.equal(items[0].zoneCount, 2);
    assert.equal(items[0].restrictedAreaCount, 1);
  });

  it("uses whichever camera field the backend sends, including a real zero", async () => {
    respondWith({
      success: true,
      data: [
        { id: "s1", cameraCount: 4 },
        { id: "s2", _count: { cameras: 0 } },
        { id: "s3", cameras: [{ id: "c1" }, { id: "c2" }] },
        { id: "s4", cameras: [] },
      ],
      meta: { ...listMeta, total: 4 },
    });
    const { items } = await siteService.getSites({ page: 1, limit: 20 });
    assert.deepEqual(items.map((s) => s.cameraCount), [4, 0, 2, 0]);
  });

  it("keeps cameraCount undefined on the site detail when the backend omits it", async () => {
    respondWith({
      success: true,
      data: { id: "s1", name: "Site A", code: "A", status: "ACTIVE", zones: [], _count: { zones: 0, restrictedAreas: 0 } },
    });
    const site = await siteService.getSiteById("s1");
    assert.equal(site.cameraCount, undefined);
    assert.equal(site.zoneCount, 0);
  });
});
