import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { apiClient, ApiError } from "@/lib/axios";
import { cronService } from "../cron.service";

const originalAdapter = apiClient.defaults.adapter;
afterEach(() => { apiClient.defaults.adapter = originalAdapter; });

describe("Cron service through the shared Axios interceptor", () => {
  it("unwraps the outer envelope exactly once and preserves job output", async () => {
    let request: InternalAxiosRequestConfig | undefined;
    const result = { jobName: "cleanup-audit-logs", success: true, durationMs: 42, data: { deletedCount: 7, retentionDays: 30 } };
    apiClient.defaults.adapter = async (config) => {
      request = config;
      return { status: 200, statusText: "OK", headers: {}, config, data: { success: true, data: result } };
    };
    assert.deepEqual(await cronService.triggerJob("cleanup-audit-logs", { params: { retentionDays: 30 } }), result);
    assert.equal(request?.url, "/cron/jobs/cleanup-audit-logs/trigger");
    assert.equal(request?.timeout, 60_000);
    assert.deepEqual(JSON.parse(request?.data), { params: { retentionDays: 30 } });
    assert.equal((request as unknown as { suppressToast: boolean }).suppressToast, true);
  });
  it("returns an unwrapped list and sends the optional server search", async () => {
    apiClient.defaults.adapter = async (config) => {
      assert.equal(config.url, "/cron/jobs");
      assert.deepEqual(config.params, { search: "audit" });
      return { status: 200, statusText: "OK", headers: {}, config, data: { success: true, data: [{ name: "cleanup-audit-logs" }] } };
    };
    assert.deepEqual(await cronService.listJobs("audit"), [{ name: "cleanup-audit-logs" }]);
  });
  it("sends one bodyless PATCH and trusts the returned state", async () => {
    let count = 0;
    apiClient.defaults.adapter = async (config) => {
      count++;
      assert.equal(config.method, "patch");
      assert.equal(config.data, undefined);
      return { status: 200, statusText: "OK", headers: {}, config, data: { success: true, data: { jobName: "cleanup-audit-logs", isEnabled: false } } };
    };
    assert.deepEqual(await cronService.toggleJob("cleanup-audit-logs"), { jobName: "cleanup-audit-logs", isEnabled: false });
    assert.equal(count, 1);
  });
  it("preserves HTTP errors and never retries a failed toggle", async () => {
    let count = 0;
    apiClient.defaults.adapter = async (config) => {
      count++;
      throw new AxiosError("Forbidden", "ERR_BAD_REQUEST", config, undefined, { status: 403, statusText: "Forbidden", headers: {}, config, data: { success: false, code: "FORBIDDEN", message: "Not allowed" } });
    };
    await assert.rejects(cronService.toggleJob("cleanup-audit-logs"), (error: unknown) => error instanceof ApiError && error.status === 403 && error.message === "Not allowed");
    assert.equal(count, 1);
  });
});
