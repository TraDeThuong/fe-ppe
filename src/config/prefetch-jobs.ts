import { authKeys } from "@/hooks/auth/auth.query-keys";
import { authService } from "@/services/auth.service";
import type { MeDto } from "@/types/auth.types";

/**
 * Bước 8 — registry prefetch theo role/permissions (xem auth-journey.md Bước 8).
 * Job-centric thay vì map role→jobs: job dùng chung cho nhiều role khai 1 lần,
 * không nhân bản. Mở rộng khi các domain sites/incidents/notifications có FE.
 */
export interface PrefetchJob {
  /** Định danh ngắn để log/debug — phải duy nhất trong registry */
  id: string;
  queryKey: readonly unknown[];
  queryFn: () => Promise<unknown>;
  /** prefetchQuery tự bỏ qua nếu cache còn tươi trong khoảng này */
  staleTime: number;
  /** Chỉ prefetch cho các role này — undefined = mọi role (kể cả role BE thêm mới sau) */
  roles?: readonly string[];
  /** Cần ÍT NHẤT 1 permission trong danh sách — undefined = không ràng buộc */
  permissions?: readonly string[];
}

export const PREFETCH_JOBS: readonly PrefetchJob[] = [
  {
    id: "auth.sessions",
    queryKey: authKeys.sessions(),
    queryFn: () => authService.getSessions(),
    staleTime: 5 * 60 * 1000,
  },
];

export function jobMatchesUser(job: PrefetchJob, user: MeDto): boolean {
  if (job.roles && !job.roles.includes(user.role)) return false;
  if (
    job.permissions &&
    !job.permissions.some((p) => user.permissions.includes(p))
  ) {
    return false;
  }
  return true;
}

export function resolvePrefetchJobs(user: MeDto): readonly PrefetchJob[] {
  return PREFETCH_JOBS.filter((job) => jobMatchesUser(job, user));
}
