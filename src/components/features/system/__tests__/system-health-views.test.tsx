import "@/hooks/auth/__tests__/setup";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocaleProvider } from "@/providers/locale-provider";
import type { ServiceHealthItem, SystemHealthReport } from "@/types";
import { SystemHealthMatrix } from "../system-health-matrix";
import { SystemHealthCards } from "../system-health-cards";
import {
  countHealthServices,
  filterHealthServices,
  resolveHealthFilter,
} from "../system-health-shared";

function render(element: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <LocaleProvider>{element}</LocaleProvider>
    </QueryClientProvider>,
  );
}

const svc = (over: Partial<ServiceHealthItem>): ServiceHealthItem => ({
  name: "Identity & Core Auth",
  serviceCode: "identity-service",
  port: 9999,
  endpoint: "http://localhost:9999/health",
  type: "SERVICE",
  status: "HEALTHY",
  latencyMs: 12,
  uptime: "1d 2h",
  lastChecked: "2026-11-28T08:00:00.000Z",
  ...over,
});

const SERVICES = [
  svc({}),
  svc({ name: "MinIO S3 Object Storage", serviceCode: "minio-storage", port: 9000, type: "INFRASTRUCTURE", status: "DOWN", latencyMs: 2001, details: { reason: "Failed to fetch" } }),
  svc({ name: "Traefik Reverse Proxy", serviceCode: "traefik-gateway", port: 80, type: "INFRASTRUCTURE" }),
];

const REPORT: SystemHealthReport = {
  overallStatus: "DEGRADED",
  healthyCount: 2,
  totalServices: 3,
  averageLatencyMs: 40,
  checkedAt: "2026-11-28T08:00:00.000Z",
  services: SERVICES,
};

describe("Shared health filters (table & cards)", () => {
  it("counts types and issues", () => {
    assert.deepEqual(countHealthServices(SERVICES), { all: 3, service: 1, infra: 2, issues: 1 });
  });

  it("filters by ISSUES and search together", () => {
    assert.deepEqual(filterHealthServices(SERVICES, "ISSUES", "").map((s) => s.serviceCode), ["minio-storage"]);
    assert.deepEqual(filterHealthServices(SERVICES, "INFRASTRUCTURE", "traefik").map((s) => s.serviceCode), ["traefik-gateway"]);
    assert.deepEqual(filterHealthServices(SERVICES, "ALL", "9999").map((s) => s.serviceCode), ["identity-service"]);
    assert.equal(filterHealthServices(SERVICES, "ISSUES", "identity").length, 0);
  });

  it("falls back to ALL when ISSUES is selected but no issue remains", () => {
    const healthyOnly = countHealthServices([SERVICES[0]]);
    assert.equal(resolveHealthFilter("ISSUES", healthyOnly), "ALL");
    assert.equal(resolveHealthFilter("ISSUES", countHealthServices(SERVICES)), "ISSUES");
  });
});

describe("SystemHealthMatrix (table view)", () => {
  it("offers the ISSUES filter, clickable rows with a fix-guide hint, and no duplicate refresh button", () => {
    const html = render(<SystemHealthMatrix healthReport={REPORT} onRefresh={() => {}} />);
    assert.ok(html.includes("Cần chú ý (1)"));
    assert.ok(html.includes("Xem hướng dẫn xử lý"));
    assert.ok(html.includes("data-clickable"));
    assert.ok(!html.includes("Làm mới"));
  });

  it("applies a filter shared from the parent", () => {
    const html = render(
      <SystemHealthMatrix healthReport={REPORT} onRefresh={() => {}} filter="ISSUES" search="" />,
    );
    assert.ok(html.includes("MinIO S3 Object Storage"));
    assert.ok(!html.includes("Traefik Reverse Proxy"));
  });
});

describe("SystemHealthCards (cards view)", () => {
  it("offers search alongside the ISSUES filter and honours a shared search", () => {
    const html = render(
      <SystemHealthCards healthReport={REPORT} onRefresh={() => {}} filter="ALL" search="traefik" />,
    );
    assert.ok(html.includes('type="search"'));
    assert.ok(html.includes("Traefik Reverse Proxy"));
    assert.ok(!html.includes(">Identity &amp; Core Auth<"));
  });
});
