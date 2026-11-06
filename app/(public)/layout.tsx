export const instant = false;

import { PublicGuard } from "./public-guard";

/**
 * Layout nhóm công khai (Server Component).
 * Tách client route guard sang PublicGuard để layout đóng vai trò RSC segment hợp lệ
 * và hỗ trợ cấu hình segment như `export const instant = false`.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <PublicGuard>{children}</PublicGuard>;
}
