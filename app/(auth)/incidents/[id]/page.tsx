import { Suspense } from "react";
import { Loader } from "@/components/ui/loader";
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
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          <Loader showLabel />
        </div>
      }
    >
      <IncidentDetailWrapper params={params} />
    </Suspense>
  );
}
