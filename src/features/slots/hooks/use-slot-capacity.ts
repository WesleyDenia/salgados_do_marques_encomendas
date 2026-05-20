import { useQuery } from "@tanstack/react-query";
import { getSlotCapacitiesQueryOptions } from "../queries";
import { type GetSlotCapacitiesParams } from "../api";

export function useSlotCapacities(params: GetSlotCapacitiesParams) {
  return useQuery({
    ...getSlotCapacitiesQueryOptions(params),
    enabled: Boolean(params.storeId && params.date),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
