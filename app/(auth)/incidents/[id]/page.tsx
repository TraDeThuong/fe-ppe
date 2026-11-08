import { Suspense } from "react";
import { PageSkeleton } from "@/components/features/app-shell/page-skeleton";
import IncidentDetailContent from "./incident-detail-content";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function IncidentDetailWrapper({ params }: PageProps) {
  const { id } = await params;
  return <IncidentDetailContent id={id} />;
}

export default function IncidentDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<PageSkeleton variant="table" />}>
      <IncidentDetailWrapper params={params} />
    </Suspense>
  );
}
