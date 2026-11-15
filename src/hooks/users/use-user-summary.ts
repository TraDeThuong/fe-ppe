"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { userService } from "@/services/user.service";
import { userKeys } from "./user.query-keys";

export interface UserSummaryResult {
  total: number;
  active: number;
  twoFactor: number;
  locked: number;
}

export type UseUserSummaryOptions = Omit<
  UseQueryOptions<UserSummaryResult, Error>,
  "queryKey" | "queryFn"
>;

export function useUserSummary(options?: UseUserSummaryOptions) {
  return useQuery<UserSummaryResult, Error>({
    queryKey: userKeys.summary(),
    queryFn: () => userService.getUserSummary(),
    staleTime: 30_000,
    ...options,
  });
}

