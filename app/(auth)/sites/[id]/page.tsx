import { Suspense } from "react";
import { PageSkeleton } from "@/components/features/app-shell/page-skeleton";
import { SiteDetailContent } from "@/components/features/sites/detail/site-detail-content";

async function SiteDetailWrapper({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SiteDetailContent siteId={id} />;
}

export default function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<PageSkeleton variant="table" />}>
      <SiteDetailWrapper params={params} />
    </Suspense>
  );
}
