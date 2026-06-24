import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  createOperationalOrderTag,
  getOperationalSettings, 
  getOperationalOrderTags,
  updateOperationalSettings, 
  updateOperationalOrderTag,
  resetOperationalSettings, 
  testWhatsAppConnection 
} from "../api";
import {
  OperationalOrderTagPayload,
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
    },
  });
}

export function useResetOperationalSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (version: number) => resetOperationalSettings(version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operational-settings"] });
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
