"use client";

import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  getOperationalRules,
  updateOperationalRules,
} from "@/features/planning/api";
import { planningKeys } from "@/features/planning/hooks/use-daily-planning";
import { slotKeys } from "@/features/slots/queries";

export const operationalRulesKeys = {
  all: ["operational-rules"] as const,
  config: () => [...operationalRulesKeys.all, "config"] as const,
};

export async function invalidateOperationalRulesQueries(
  queryClient: QueryClient,
) {
  await queryClient.invalidateQueries({ queryKey: operationalRulesKeys.config() });
  await queryClient.invalidateQueries({ queryKey: planningKeys.all });
  await queryClient.invalidateQueries({ queryKey: slotKeys.all });
}

export function useOperationalRules(enabled = true) {
  return useQuery({
    queryKey: operationalRulesKeys.config(),
    queryFn: getOperationalRules,
    enabled,
  });
}

export function useUpdateOperationalRules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateOperationalRules,
    onSuccess: async () => {
      await invalidateOperationalRulesQueries(queryClient);
    },
  });
}
