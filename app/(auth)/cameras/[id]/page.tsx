import { Suspense } from "react";
import { CameraIntelligenceContent } from "@/components/features/cameras/detail/camera-intelligence-content";

export default async function CameraDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm">Đang tải trung tâm phân tích AI Camera #{id}...</p>
        </div>
      }
    >
      <CameraIntelligenceContent cameraId={id} />
    </Suspense>
  );
}
