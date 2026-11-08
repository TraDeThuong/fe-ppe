import { Suspense } from "react";
import { Loader } from "@/components/ui/loader";
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
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          <Loader showLabel />
        </div>
      }
    >
      <RoleDetailWrapper params={params} />
    </Suspense>
  );
}
