import { Suspense } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { PageSkeleton } from "@/components/features/app-shell/page-skeleton";
import { incidentKeys } from "@/hooks/incidents/incident.query-keys";
import { resolveIncidentListScope } from "@/lib/incident-list-scope";
import { parseIncidentPeriodFromUrl, resolveIncidentPeriod } from "@/lib/incident-period";
import {
  createServerQueryClient,
  readSearchParam,
  serverApiGet,
  serverUnwrapData,
  serverUnwrapPaginated,
} from "@/lib/server-api";
import type { IncidentItem, IncidentQueryParams } from "@/types";
import IncidentsContent from "./incidents-content";

async function IncidentsServerWrapper({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await searchParams;
  const queryClient = createServerQueryClient();
  const get = (key: string) => readSearchParam(resolved, key);
  const hasExplicitSite = Object.hasOwn(resolved, "siteId");

  const statParam = get("stat");
  const { status, requiresRole } = resolveIncidentListScope((key) =>
    key === "siteId" && hasExplicitSite ? get(key) ?? "" : get(key),
  );
  const severity = statParam === "critical" ? "CRITICAL" : undefined;
  const siteId = get("siteId");
  const cameraId = get("cameraId");
  const { fromDate, toDate } = resolveIncidentPeriod(
    parseIncidentPeriodFromUrl(
      {
        period: get("period"),
        fromDate: get("fromDate"),
        toDate: get("toDate"),
      },
      "",
    ),
  );

  const listParams: IncidentQueryParams = {
    page: 1,
    limit: 10,
    search: undefined,
    status,
    severity,
    violationType: undefined,
    siteId,
    cameraId,
    fromDate,
    toDate,
    sortBy: "detectedAt",
    sortOrder: "desc",
    includeAssignments: true,
  };

  // Without a site parameter, the client may use a persisted global site filter.
  const [listRaw, countsRaw] = await Promise.all([
    hasExplicitSite && !requiresRole ? serverApiGet("/incidents", { ...listParams }) : null,
    hasExplicitSite ? serverApiGet("/incidents/status-counts", { siteId, cameraId, fromDate, toDate }) : null,
  ]);

  const list = serverUnwrapPaginated<IncidentItem>(listRaw);
  if (list) {
    queryClient.setQueryData(incidentKeys.list(listParams), list);
  }

  const counts = serverUnwrapData<{
    total?: number;
    pendingReview?: number;
    critical?: number;
    resolved?: number;
  }>(countsRaw);
  if (counts) {
    queryClient.setQueryData(
      incidentKeys.statusCounts({ siteId, cameraId, fromDate, toDate }),
      {
        total: Number(counts.total ?? 0),
        pendingReview: Number(counts.pendingReview ?? 0),
        critical: Number(counts.critical ?? 0),
        resolved: Number(counts.resolved ?? 0),
      },
    );
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <IncidentsContent />
    </HydrationBoundary>
  );
}

export default function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<PageSkeleton variant="table" />}>
      <IncidentsServerWrapper searchParams={searchParams} />
    </Suspense>
  );
}
