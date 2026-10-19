import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/axios";
import { toast } from "@/lib/toast";

const queryCache = new QueryCache({
  onError: (error) => {
    // Lỗi kỹ thuật đã toast ở interceptor; ở đây chỉ bắt lỗi bất ngờ
    // không phải ApiError (bug code, exception trong queryFn...)
    if (!(error instanceof ApiError)) {
      toast.error(error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định.", {
        id: "api-global-error",
      });
    }
  },
});

// MutationCache KHÔNG toast — mỗi mutation tự toast theo ngữ cảnh form (Bước 6)
const mutationCache = new MutationCache();

export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      // Không retry lỗi 4xx (401/403/422...) — 401 đã có interceptor xử lý refresh
      retry: (failureCount, error) =>
        error instanceof ApiError && (error.status === 0 || error.status >= 500) && failureCount < 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
