import { Suspense } from "react";
import UsersContent from "./users-content";

export default function UsersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
          <p>Đang tải danh sách người dùng...</p>
        </div>
      }
    >
      <UsersContent />
    </Suspense>
  );
}
