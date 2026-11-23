if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:80/api/v1";
}
if (!process.env.NEXT_PUBLIC_APP_URL) {
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
}

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { incidentService } from "@/services/incident.service";
import {
  fetchIncidentStatusBucket,
  mergeStatusBuckets,
} from "../use-assignment-incidents";
import type { IncidentItem } from "@/types";

const makeIncident = (
  id: string,
  status: string,
  detectedAt: string,
): IncidentItem => ({
  id,
  siteId: "site-1",
  cameraId: "cam-1",
  violationType: "NO_HELMET",
  severity: "HIGH",
  status,
  detectedAt,
  createdAt: detectedAt,
  updatedAt: detectedAt,
  assignments: [],
});

describe("use-assignment-incidents helpers (Phương án A - status bucketed)", () => {
  it("merges all 5 status buckets without duplicates, preserves newest-first order, and computes full DB totals from meta.total", () => {
    const merged = mergeStatusBuckets({
      pendingReview: {
        items: [makeIncident("p-1", "PENDING_REVIEW", "2026-11-22T09:36:00Z")],
        total: 526,
      },
      confirmed: {
        items: [
          makeIncident("c-1", "CONFIRMED", "2026-11-18T12:56:00Z"),
          makeIncident("c-2", "CONFIRMED", "2026-11-18T11:00:00Z"),
        ],
        total: 122,
      },
      resolved: {
        items: [makeIncident("r-1", "RESOLVED", "2026-11-17T09:50:00Z")],
        total: 2,
      },
      closed: {
        items: [
          makeIncident("cl-1", "CLOSED", "2026-11-18T12:10:00Z"),
          // Duplicate id guard
          makeIncident("c-1", "CONFIRMED", "2026-11-18T12:56:00Z"),
        ],
        total: 115,
      },
      dismissed: {
        items: [makeIncident("d-1", "DISMISSED", "2026-11-03T04:11:00Z")],
        total: 1,
      },
    });

    assert.equal(merged.items.length, 6);
    assert.deepEqual(
      merged.items.map((i) => i.id),
      ["p-1", "c-1", "cl-1", "c-2", "r-1", "d-1"],
    );
    assert.deepEqual(merged.totals, {
      pendingReview: 526,
      confirmed: 122,
      resolved: 2,
      closed: 115,
      dismissed: 1,
      closedOrDismissed: 116,
      total: 766,
    });
  });

  it("fetches additional pages for CONFIRMED up to maxPages and respects BE limit <= 100", async () => {
    const originalGetIncidents = incidentService.getIncidents;
    const calls: Array<{ page?: number; limit?: number; status?: string }> = [];

    incidentService.getIncidents = (async (params) => {
      calls.push({
        page: params?.page,
        limit: params?.limit,
        status: params?.status,
      });
      if (params?.page === 1) {
        return {
          items: [makeIncident("c-page1", "CONFIRMED", "2026-11-18T12:00:00Z")],
          meta: { page: 1, limit: 100, total: 122, totalPages: 2 },
        };
      }
      return {
        items: [makeIncident("c-page2", "CONFIRMED", "2026-11-17T12:00:00Z")],
        meta: { page: 2, limit: 100, total: 122, totalPages: 2 },
      };
    }) as typeof incidentService.getIncidents;

    try {
      const result = await fetchIncidentStatusBucket({
        status: "CONFIRMED",
        limit: 100,
        maxPages: 3,
        includeAssignments: true,
      });

      assert.equal(calls.length, 2);
      assert.deepEqual(calls, [
        { page: 1, limit: 100, status: "CONFIRMED" },
        { page: 2, limit: 100, status: "CONFIRMED" },
      ]);
      assert.equal(result.items.length, 2);
      assert.equal(result.total, 122);
    } finally {
      incidentService.getIncidents = originalGetIncidents;
    }
  });

  it("gracefully keeps page 1 results if page 2 hits HTTP 429 rate-limit", async () => {
    const originalGetIncidents = incidentService.getIncidents;

    incidentService.getIncidents = (async (params) => {
      if (params?.page === 1) {
        return {
          items: [makeIncident("c-1", "CONFIRMED", "2026-11-18T12:00:00Z")],
          meta: { page: 1, limit: 100, total: 250, totalPages: 3 },
        };
      }
      throw Object.assign(new Error("Too Many Requests"), { status: 429 });
    }) as typeof incidentService.getIncidents;

    try {
      const result = await fetchIncidentStatusBucket({
        status: "CONFIRMED",
        limit: 100,
        maxPages: 3,
        includeAssignments: true,
      });

      assert.equal(result.items.length, 1);
      assert.equal(result.total, 250);
    } finally {
      incidentService.getIncidents = originalGetIncidents;
    }
  });
});
