"use client";

import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  getSlotCapacityConfig,
  updateSlotCapacityConfig,
} from "@/features/planning/api";
import { planningKeys } from "@/features/planning/hooks/use-daily-planning";
import { slotKeys } from "@/features/slots/queries";

export const planningAdminKeys = {
  all: ["planning-admin"] as const,
  slotCapacities: () => [...planningAdminKeys.all, "slot-capacities"] as const,
};

export async function invalidatePlanningCapacityQueries(
  queryClient: QueryClient,
) {
  await queryClient.invalidateQueries({ queryKey: planningAdminKeys.slotCapacities() });
  await queryClient.invalidateQueries({ queryKey: planningKeys.all });
  await queryClient.invalidateQueries({ queryKey: slotKeys.all });
}

export function useSlotCapacityConfig(enabled = true) {
  return useQuery({
    queryKey: planningAdminKeys.slotCapacities(),
    queryFn: getSlotCapacityConfig,
    enabled,
  });
}

export function useUpdateSlotCapacityConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSlotCapacityConfig,
    onSuccess: async () => {
      await invalidatePlanningCapacityQueries(queryClient);
    },
  });
}
