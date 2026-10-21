import { Suspense } from "react";
import IncidentDetailContent from "./incident-detail-content";

export function generateStaticParams() {
  return [
    { id: "INC-1042" },
    { id: "INC-1041" },
    { id: "sample" },
  ];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function IncidentDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          <p>Đang tải chi tiết sự cố {id}...</p>
        </div>
      }
    >
      <IncidentDetailContent id={id} />
    </Suspense>
  );
}
