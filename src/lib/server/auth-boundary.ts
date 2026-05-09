import type { PanelSessionUser } from "@/lib/auth/session";
import type { PanelSession } from "@/lib/auth/session";
import { getServerRuntimeConfig } from "@/lib/server/env";

const GENERIC_AUTH_ERROR_MESSAGE =
  "Não foi possível autenticar no painel com as credenciais fornecidas.";

export function isPanelSessionUser(value: unknown): value is PanelSessionUser {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<PanelSessionUser>;

  return (
    typeof candidate.id === "number" &&
    typeof candidate.name === "string" &&
    typeof candidate.email === "string" &&
    typeof candidate.role === "string" &&
    typeof candidate.active === "boolean"
  );
}

export function parseUpstreamUser(data: unknown): PanelSessionUser | null {
  if (isPanelSessionUser(data)) {
    return data;
  }

  if (data && typeof data === "object") {
    const wrappedData = Reflect.get(data, "data");

    return isPanelSessionUser(wrappedData) ? wrappedData : null;
  }

  return null;
}

export function getLoginFailureMessage(status: number) {
  if (status === 401 || status === 403) {
    return GENERIC_AUTH_ERROR_MESSAGE;
  }

  return "Não foi possível concluir o login no painel neste momento.";
}

export async function readJsonResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  return response.json();
}

export async function fetchCurrentPanelUser(session: PanelSession) {
  const { apiUpstreamUrl } = getServerRuntimeConfig();
  const upstreamUrl = new URL(apiUpstreamUrl);

  upstreamUrl.pathname = `${upstreamUrl.pathname.replace(/\/$/, "")}/me`;

  try {
    const response = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return parseUpstreamUser(await readJsonResponse(response));
  } catch {
    return null;
  }
}
