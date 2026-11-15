import { Suspense } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { PageSkeleton } from "@/components/features/app-shell/page-skeleton";
import { cameraKeys } from "@/hooks/cameras/camera.query-keys";
import {
  createServerQueryClient,
  readSearchParam,
  serverApiGet,
  serverUnwrapPaginated,
} from "@/lib/server-api";
import type { CameraItem, CameraQueryParams } from "@/types";
import CamerasContent from "./cameras-content";

async function CamerasServerWrapper({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await searchParams;
  const queryClient = createServerQueryClient();

  const search = readSearchParam(resolved, "search");
  const siteId = readSearchParam(resolved, "siteId");

  const listParams: CameraQueryParams = {
    page: 1,
    limit: 10,
    search,
    siteId,
    zoneId: undefined,
    status: undefined,
    sortBy: "createdAt",
    sortOrder: "desc",
  };

  const listRaw = await serverApiGet("/cameras", {
    page: listParams.page,
    limit: listParams.limit,
    search: listParams.search,
    siteId: listParams.siteId,
    sortBy: listParams.sortBy,
    sortOrder: listParams.sortOrder,
  });

  const list = serverUnwrapPaginated<CameraItem>(listRaw);
  if (list) {
    queryClient.setQueryData(cameraKeys.list(listParams), list);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CamerasContent />
    </HydrationBoundary>
  );
}

export default function CamerasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<PageSkeleton variant="table" />}>
      <CamerasServerWrapper searchParams={searchParams} />
    </Suspense>
  );
}
