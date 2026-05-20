import { getSlotCapacities, type GetSlotCapacitiesParams } from "./api";

export const slotKeys = {
  all: ["slots"] as const,
  capacities: () => [...slotKeys.all, "capacities"] as const,
  capacitiesList: (params: GetSlotCapacitiesParams) =>
    [...slotKeys.capacities(), params] as const,
};

export const getSlotCapacitiesQueryOptions = (params: GetSlotCapacitiesParams) => ({
  queryKey: slotKeys.capacitiesList(params),
  queryFn: () => getSlotCapacities(params),
});
