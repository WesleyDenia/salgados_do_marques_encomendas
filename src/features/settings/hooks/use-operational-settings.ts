import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  getOperationalSettings, 
  updateOperationalSettings, 
  resetOperationalSettings, 
  testWhatsAppConnection 
} from "../api";
import { OperationalSettingsUpdatePayload } from "../types";

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
