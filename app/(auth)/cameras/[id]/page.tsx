import { Suspense } from "react";
import { Loader } from "@/components/ui/loader";
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
    <Suspense
      fallback={
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader showLabel />
        </div>
      }
    >
      <CameraDetailWrapper params={params} />
    </Suspense>
  );
}
