import axios from "axios";

import { apiClient } from "@/lib/api/http";

import type { LoginFormValues } from "@/features/auth/schemas/auth-schemas";
import type { LoginResponse } from "@/features/auth/types";

export async function loginWithPanelSession(credentials: LoginFormValues) {
  const response = await apiClient.post<LoginResponse>("/login", credentials);

  return response.data;
}

export async function logoutFromPanelSession() {
  await apiClient.post("/logout");
}

export function getAuthErrorMessage(error: unknown) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return (
      error.response?.data?.message ??
      "Não foi possível autenticar no painel neste momento."
    );
  }

  return "Não foi possível autenticar no painel neste momento.";
}
