import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPreparationSlot,
  deletePreparationSlot,
  deletePreparationTime,
  getFryingPlan,
  getPreparationCapacity,
  savePreparationTime,
  updatePreparationSlot,
  updatePreparationTime,
} from "./api";

export const fryingKeys = {
  all: ["frying"] as const,
  plan: (date: string, storeId: number) => [...fryingKeys.all, "plan", date, storeId] as const,
  capacity: (storeId: number) => [...fryingKeys.all, "capacity", storeId] as const,
};

export function useFryingPlan(date: string, storeId: number) {
  return useQuery({ queryKey: fryingKeys.plan(date, storeId), queryFn: () => getFryingPlan(date, storeId), enabled: Boolean(date && storeId), refetchInterval: 30_000 });
}

export function usePreparationCapacity(storeId: number) {
  return useQuery({ queryKey: fryingKeys.capacity(storeId), queryFn: () => getPreparationCapacity(storeId), enabled: storeId > 0 });
}

export function useCreatePreparationSlot() {
  const client = useQueryClient();
  return useMutation({ mutationFn: createPreparationSlot, onSuccess: (_data, input) => client.invalidateQueries({ queryKey: fryingKeys.capacity(input.storeId) }) });
}

export function useSavePreparationTime() {
  const client = useQueryClient();
  return useMutation({ mutationFn: savePreparationTime, onSuccess: (_data, input) => client.invalidateQueries({ queryKey: fryingKeys.capacity(input.storeId) }) });
}

export function useUpdatePreparationSlot() {
  const client = useQueryClient();
  return useMutation({ mutationFn: updatePreparationSlot, onSuccess: (_data, input) => client.invalidateQueries({ queryKey: fryingKeys.capacity(input.storeId) }) });
}

export function useDeletePreparationSlot() {
  const client = useQueryClient();
  return useMutation({ mutationFn: deletePreparationSlot, onSuccess: (_data, input) => client.invalidateQueries({ queryKey: fryingKeys.capacity(input.storeId) }) });
}

export function useUpdatePreparationTime() {
  const client = useQueryClient();
  return useMutation({ mutationFn: updatePreparationTime, onSuccess: (_data, input) => client.invalidateQueries({ queryKey: fryingKeys.capacity(input.storeId) }) });
}

export function useDeletePreparationTime() {
  const client = useQueryClient();
  return useMutation({ mutationFn: deletePreparationTime, onSuccess: (_data, input) => client.invalidateQueries({ queryKey: fryingKeys.capacity(input.storeId) }) });
}
