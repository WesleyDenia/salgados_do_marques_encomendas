import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/http";
import { ApiError } from "@/types/api";

export function useApiQuery<T>(
  queryKey: unknown[],
  url: string,
  options?: Omit<UseQueryOptions<T, ApiError>, "queryKey" | "queryFn">
) {
  return useQuery<T, ApiError>({
    queryKey,
    queryFn: async () => {
      const response = await apiClient.get<T>(url);
      return response.data;
    },
    ...options,
  });
}

export function useApiMutation<TVariables = void, TData = any>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, ApiError, TVariables>
) {
  return useMutation<TData, ApiError, TVariables>({
    mutationFn,
    ...options,
  });
}
