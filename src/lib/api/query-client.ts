import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/types/api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      gcTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error) => {
        const apiError = error as ApiError;
        
        // Don't retry on certain errors
        if (
          apiError.status === 401 ||
          apiError.status === 403 ||
          apiError.status === 404 ||
          apiError.status === 422
        ) {
          return false;
        }

        return failureCount < 3;
      },
      refetchOnWindowFocus: true,
      refetchOnReconnect: "always",
    },
    mutations: {
      retry: false,
    },
  },
});
