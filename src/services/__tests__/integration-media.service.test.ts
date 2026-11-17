import "@/hooks/auth/__tests__/setup";
import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { apiClient } from "@/lib/axios";
import { integrationService } from "../integration.service";
import { mediaService } from "../media.service";

describe("integrationService & mediaService contracts", () => {
  it("integrationService calls /integration/* endpoints with expected params", async () => {
    const getMock = mock.method(apiClient, "get", async (url: string) => {
      if (url === "/integration/api-keys") return [{ id: "k1", name: "ERP", prefix: "ak_live_", permissions: [], isActive: true, createdAt: "2026-01-01" }];
      if (url.includes("/deliveries")) return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      return [];
    });
    const postMock = mock.method(apiClient, "post", async () => ({
      id: "k1",
      name: "ERP",
      key: "ak_live_secret",
      prefix: "ak_live_",
      permissions: ["USER_READ"],
      createdAt: "2026-01-01",
    }));

    try {
      const keys = await integrationService.listApiKeys();
      assert.equal(keys.length, 1);
      assert.equal(keys[0].name, "ERP");

      const created = await integrationService.createApiKey({
        name: "ERP",
        permissions: ["USER_READ"],
      });
      assert.equal(created.key, "ak_live_secret");

      const deliveries = await integrationService.listDeliveries("w1", {
        page: 1,
        limit: 20,
        status: "FAILED",
      });
      assert.deepEqual(deliveries.items, []);
      assert.equal(getMock.mock.callCount(), 2);
      assert.equal(postMock.mock.callCount(), 1);
    } finally {
      getMock.mock.restore();
      postMock.mock.restore();
    }
  });

  it("mediaService sends BE-aligned cleanup payload fields (unconfirmedMaxAgeHours, softDeletedRetentionDays)", async () => {
    let capturedBody: unknown = null;
    const postMock = mock.method(
      apiClient,
      "post",
      async (_url: string, body?: unknown) => {
        capturedBody = body;
        return { unconfirmedCleaned: 2, softDeletedCleaned: 1, cleanedAt: "2026-11-17T00:00:00Z" };
      },
    );

    try {
      const res = await mediaService.cleanupOrphanFiles({
        unconfirmedMaxAgeHours: 24,
        softDeletedRetentionDays: 30,
      });
      assert.equal(res.unconfirmedCleaned, 2);
      assert.deepEqual(capturedBody, {
        unconfirmedMaxAgeHours: 24,
        softDeletedRetentionDays: 30,
      });
    } finally {
      postMock.mock.restore();
    }
  });
});

