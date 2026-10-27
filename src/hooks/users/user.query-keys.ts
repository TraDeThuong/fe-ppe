import type { UserQueryParams } from "@/types";

/**
 * Factory quản lý tập trung React Query Keys cho module Người dùng (Users).
 */
export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (params?: UserQueryParams) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, "detail"] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  sessions: (id: string) => [...userKeys.detail(id), "sessions"] as const,
  devices: (id: string) => [...userKeys.detail(id), "devices"] as const,
};
