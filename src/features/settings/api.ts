import { apiClient } from "@/lib/api/http";
import { PanelSessionUser } from "@/lib/auth/session";
import { ApiResponse } from "@/types/api";

export async function getUsers() {
  const response = await apiClient.get<ApiResponse<PanelSessionUser[]>>("/admin/users");
  return response.data;
}

export async function updateUserRole(userId: number, role: string) {
  const response = await apiClient.put<ApiResponse<PanelSessionUser>>(`/admin/users/${userId}`, { role });
  return response.data;
}
