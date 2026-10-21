import { notFound } from "next/navigation";

// Bắt mọi route chưa tồn tại trong nhóm (auth) để 404 render trong shell
// (not-found.tsx cùng segment) thay vì 404 toàn cục mất khung sidebar/header.
// Stub pages ở M2 sẽ thay thế dần; catch-all giữ shell cho các route còn lại.
export default function CatchAllPage() {
  notFound();
}
