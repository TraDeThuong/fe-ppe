import { Suspense } from "react";
import { SiteDetailContent } from "@/components/features/sites/detail/site-detail-content";

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          <p>Đang tải trung tâm điều hành công trường...</p>
        </div>
      }
    >
      <SiteDetailContent siteId={id} />
    </Suspense>
  );
}
