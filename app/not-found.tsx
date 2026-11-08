import { Suspense } from "react";
import type { Metadata } from "next";
import { NotFoundView } from "@/components/features/not-found";

export const metadata: Metadata = {
  title: "404 - Không tìm thấy trang | Smart PPE Monitoring",
  description: "Trang bạn tìm không tồn tại hoặc đã bị di chuyển trên hệ thống Smart PPE Monitoring.",
};

export default function RootNotFound() {
  return (
    <Suspense fallback={null}>
      <NotFoundView mode="fullscreen" />
    </Suspense>
  );
}
