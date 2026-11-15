import { Suspense } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { PageSkeleton } from "@/components/features/app-shell/page-skeleton";
import { incidentKeys } from "@/hooks/incidents/incident.query-keys";
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

  const statParam = readSearchParam(resolved, "stat");
  const status =
    readSearchParam(resolved, "status") ||
    (statParam === "pending-review" || statParam === "pendingReview"
      ? "PENDING_REVIEW"
      : statParam === "resolved"
        ? "RESOLVED"
        : undefined);
  const severity = statParam === "critical" ? "CRITICAL" : undefined;
  const siteId = readSearchParam(resolved, "siteId");
  const cameraId = readSearchParam(resolved, "cameraId");
  const fromDate = readSearchParam(resolved, "fromDate");
  const toDate = readSearchParam(resolved, "toDate");

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
  };

  const [listRaw, countsRaw] = await Promise.all([
    serverApiGet("/incidents", {
      page: listParams.page,
      limit: listParams.limit,
      status: listParams.status,
      severity: listParams.severity,
      siteId: listParams.siteId,
      cameraId: listParams.cameraId,
      fromDate: listParams.fromDate,
      toDate: listParams.toDate,
      sortBy: listParams.sortBy,
      sortOrder: listParams.sortOrder,
    }),
    serverApiGet("/incidents/status-counts", {
      siteId,
      cameraId,
      fromDate,
      toDate,
    }),
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
