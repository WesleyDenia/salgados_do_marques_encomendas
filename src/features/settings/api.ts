import { apiClient } from "@/lib/api/http";
import { PanelSessionUser } from "@/lib/auth/session";
import { ApiResponse } from "@/types/api";
import { OperationalSettings, OperationalSettingsUpdatePayload } from "./types";

export async function getUsers() {
  const response = await apiClient.get<ApiResponse<PanelSessionUser[]>>("/admin/users");
  return response.data;
}

export async function updateUserRole(userId: number, role: string) {
  const response = await apiClient.put<ApiResponse<PanelSessionUser>>(`/admin/users/${userId}`, { role });
  return response.data;
}

export async function getOperationalSettings() {
  const response = await apiClient.get<OperationalSettings>("/admin/settings/operational");
  return response.data;
}

export async function updateOperationalSettings(payload: OperationalSettingsUpdatePayload) {
  const response = await apiClient.put<{ message: string; changes_count: number }>("/admin/settings/operational", payload);
  return response.data;
}

export async function resetOperationalSettings(version: number) {
  const response = await apiClient.post<{ message: string; changes_count: number }>("/admin/settings/operational/reset", { version });
  return response.data;
}

export async function testWhatsAppConnection(number: string) {
  const response = await apiClient.post<{ success: boolean; message: string }>("/admin/settings/test-whatsapp", { number });
  return response.data;
}
