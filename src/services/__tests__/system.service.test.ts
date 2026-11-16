import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { apiClient } from "@/lib/axios";
import { systemService } from "../system.service";

const originalAdapter = apiClient.defaults.adapter;
const originalFetch = globalThis.fetch;

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
  globalThis.fetch = originalFetch;
});

describe("systemService.checkServicesHealth", () => {
  it("marks 2xx unwrapped apiClient health payloads as HEALTHY without false-positive DOWN", async () => {
    apiClient.defaults.adapter = async (config) => {
      assert.equal(
        (config as unknown as { suppressToast?: boolean }).suppressToast,
        true,
      );
      if (config.url === "/health/readiness") {
        return {
          status: 200,
          statusText: "OK",
          headers: {},
          config,
          data: {
            success: true,
            data: {
              status: "ok",
              uptime: 3665,
              checks: { database: { status: "healthy", latencyMs: 12 } },
            },
          },
        };
      }
      return {
        status: 200,
        statusText: "OK",
        headers: {},
        config,
        data: { success: true, data: { status: "ok", uptime: 1200 } },
      };
    };

    globalThis.fetch = async () =>
      new Response(JSON.stringify({ status: "ok", uptime: 500 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });

    const report = await systemService.checkServicesHealth();
    assert.equal(report.totalServices, 12);
    assert.equal(report.healthyCount, 12);
    assert.equal(report.overallStatus, "HEALTHY");
    assert.ok(report.services.every((s) => s.status === "HEALTHY"));
    const aiService = report.services.find((s) => s.serviceCode === "ai-service");
    assert.equal(aiService?.endpoint, "/health (:8000)");
  });

  it("marks failed direct fetch as DOWN with diagnostic reason and sorts issues first", async () => {
    apiClient.defaults.adapter = async (config) => ({
      status: 200,
      statusText: "OK",
      headers: {},
      config,
      data: { success: true, data: { status: "ok" } },
    });

    globalThis.fetch = async (input) => {
      const url = String(input);
      if (url.includes("target=minio")) {
        return new Response(
          JSON.stringify({
            ok: false,
            statusCode: null,
            latencyMs: 5,
            failureKind: "CONNECTION_REFUSED",
            reason: "Connection refused (ECONNREFUSED)",
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }
      return new Response(JSON.stringify({ ok: true, latencyMs: 4 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const report = await systemService.checkServicesHealth();
    assert.equal(report.healthyCount, 11);
    assert.equal(report.overallStatus, "DEGRADED");
    assert.equal(report.services[0]?.serviceCode, "minio-storage");
    assert.equal(report.services[0]?.status, "DOWN");
    assert.equal(report.services[0]?.details?.failureKind, "CONNECTION_REFUSED");
    assert.ok(
      typeof report.services[0]?.details?.reason === "string" &&
        report.services[0].details.reason.includes("ECONNREFUSED"),
    );
  });

  it("infers Traefik Gateway as healthy when admin :8080 ping fails but gateway-routed services succeed", async () => {
    apiClient.defaults.adapter = async (config) => ({
      status: 200,
      statusText: "OK",
      headers: {},
      config,
      data: { success: true, data: { status: "ok" } },
    });

    globalThis.fetch = async (input) => {
      const url = String(input);
      if (url.includes("target=traefik")) {
        return new Response(
          JSON.stringify({
            ok: false,
            statusCode: null,
            latencyMs: 6,
            failureKind: "CONNECTION_REFUSED",
            reason: "Connection refused (ECONNREFUSED)",
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }
      return new Response(JSON.stringify({ ok: true, latencyMs: 5 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const report = await systemService.checkServicesHealth();
    const traefik = report.services.find(
      (s) => s.serviceCode === "traefik-gateway",
    );
    assert.equal(traefik?.status, "HEALTHY");
    assert.equal(traefik?.details?.verifiedVia, "active-gateway-traffic");
    assert.equal(report.healthyCount, 12);
  });
});

