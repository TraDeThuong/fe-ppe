import { Suspense } from "react";
import { PageSkeleton } from "@/components/features/app-shell/page-skeleton";
import { UserDetailContent } from "@/components/features/users/detail/user-detail-content";

async function UserDetailWrapper({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <UserDetailContent userId={id} />;
}

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<PageSkeleton variant="dashboard" />}>
      <UserDetailWrapper params={params} />
    </Suspense>
  );
}
