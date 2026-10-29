import { Suspense } from "react";
import { Loader } from "@/components/ui/loader";
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
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          <Loader showLabel />
        </div>
      }
    >
      <SiteDetailWrapper params={params} />
    </Suspense>
  );
}
