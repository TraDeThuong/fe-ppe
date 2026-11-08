import { Suspense } from "react";
import { PageSkeleton } from "@/components/features/app-shell/page-skeleton";
import { CameraIntelligenceContent } from "@/components/features/cameras/detail/camera-intelligence-content";

async function CameraDetailWrapper({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CameraIntelligenceContent cameraId={id} />;
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
