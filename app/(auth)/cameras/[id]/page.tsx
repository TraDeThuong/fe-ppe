import { Suspense } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { PageSkeleton } from "@/components/features/app-shell/page-skeleton";
import { CameraIntelligenceContent } from "@/components/features/cameras/detail/camera-intelligence-content";
import { cameraKeys } from "@/hooks/cameras/camera.query-keys";
import {
  createServerQueryClient,
  serverApiGet,
  serverUnwrapData,
  serverUnwrapPaginated,
} from "@/lib/server-api";
import type { CameraConfigItem, CameraItem, IncidentItem } from "@/types";

async function CameraDetailWrapper({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const queryClient = createServerQueryClient();

  const [cameraRaw, configRaw, incidentsRaw] = await Promise.all([
    serverApiGet(`/cameras/${encodeURIComponent(id)}`),
    serverApiGet(`/cameras/${encodeURIComponent(id)}/config`),
    serverApiGet("/incidents", {
      cameraId: id,
      limit: 30,
      sortOrder: "desc",
    }),
  ]);

  const camera = serverUnwrapData<CameraItem>(cameraRaw);
  if (camera) {
    queryClient.setQueryData(cameraKeys.detail(id), camera);
  }

  const config = serverUnwrapData<CameraConfigItem>(configRaw);
  if (config) {
    queryClient.setQueryData(cameraKeys.config(id), config);
  }

  const incidents = serverUnwrapPaginated<IncidentItem>(incidentsRaw);
  if (incidents) {
    queryClient.setQueryData(["camera-detail-incidents", id], incidents);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CameraIntelligenceContent cameraId={id} />
    </HydrationBoundary>
  );
}

export default function CameraDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<PageSkeleton variant="dashboard" />}>
      <CameraDetailWrapper params={params} />
    </Suspense>
  );
}
