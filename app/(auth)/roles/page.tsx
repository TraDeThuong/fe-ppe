import { Suspense } from "react";
import RolesContent from "./roles-content";

export default function RolesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          <p>Đang tải danh sách vai trò & phân quyền...</p>
        </div>
      }
    >
      <RolesContent />
    </Suspense>
  );
}
