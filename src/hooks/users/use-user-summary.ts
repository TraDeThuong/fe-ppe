"use client";

import { useQuery } from "@tanstack/react-query";
import { userService } from "@/services/user.service";
import { userKeys } from "./user.query-keys";

export function useUserSummary() {
  return useQuery({
    queryKey: userKeys.summary(),
    queryFn: () => userService.getUserSummary(),
    staleTime: 30_000,
  });
}

