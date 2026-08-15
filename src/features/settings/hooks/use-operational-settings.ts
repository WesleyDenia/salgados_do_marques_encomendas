import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  createOperationalOrderTag,
  getPreparationCapacityConfig,
  getOperationalSettings, 
  getOperationalOrderTags,
  updatePreparationCapacityConfig,
  updateOperationalSettings, 
  updateOperationalOrderTag,
  resetOperationalSettings, 
  testWhatsAppConnection 
} from "../api";
import {
  OperationalOrderTagPayload,
  OperationalPreparationCapacityUpdatePayload,
  OperationalSettingsUpdatePayload,
} from "../types";

export function useOperationalSettings() {
  return useQuery({
    queryKey: ["operational-settings"],
    queryFn: getOperationalSettings,
  });
}

export function useUpdateOperationalSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: OperationalSettingsUpdatePayload) => updateOperationalSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operational-settings"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "settings"] });
      queryClient.invalidateQueries({ queryKey: ["planning"] });
      queryClient.invalidateQueries({ queryKey: ["planning-admin"] });
      queryClient.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}

export function useResetOperationalSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (version: number) => resetOperationalSettings(version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operational-settings"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "settings"] });
      queryClient.invalidateQueries({ queryKey: ["planning"] });
      queryClient.invalidateQueries({ queryKey: ["planning-admin"] });
      queryClient.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}

export function useTestWhatsAppConnection() {
  return useMutation({
    mutationFn: (number: string) => testWhatsAppConnection(number),
  });
}

export function useOperationalOrderTags() {
  return useQuery({
    queryKey: ["operational-order-tags"],
    queryFn: getOperationalOrderTags,
  });
}

export function usePreparationCapacityConfig() {
  return useQuery({
    queryKey: ["operational-preparation-capacity"],
    queryFn: getPreparationCapacityConfig,
  });
}

export function useUpdatePreparationCapacityConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: OperationalPreparationCapacityUpdatePayload) =>
      updatePreparationCapacityConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operational-preparation-capacity"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["planning"] });
    },
  });
}

export function useCreateOperationalOrderTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: OperationalOrderTagPayload) =>
      createOperationalOrderTag(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operational-order-tags"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "settings"] });
    },
  });
}

export function useUpdateOperationalOrderTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tagId,
      payload,
    }: {
      tagId: number;
      payload: OperationalOrderTagPayload;
    }) => updateOperationalOrderTag(tagId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operational-order-tags"] });
      queryClient.invalidateQueries({ queryKey: ["orders", "settings"] });
    },
  });
}
