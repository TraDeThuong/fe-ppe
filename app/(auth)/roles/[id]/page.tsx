import { Suspense } from "react";
import { PageSkeleton } from "@/components/features/app-shell/page-skeleton";
import { RoleDetailContent } from "@/components/features/roles/detail/role-detail-content";

async function RoleDetailWrapper({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RoleDetailContent roleId={id} />;
}

export default function RoleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<PageSkeleton variant="table" />}>
      <RoleDetailWrapper params={params} />
    </Suspense>
  );
}
