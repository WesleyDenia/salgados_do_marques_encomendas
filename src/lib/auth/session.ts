import { createHmac, timingSafeEqual } from "node:crypto";

import { isLivePanelRole, isPanelRole } from "@/lib/auth/authorization";
import { getServerRuntimeConfig } from "@/lib/server/env";

const PANEL_SESSION_PURPOSE = "panel-auth-session";

export type PanelSessionUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
};

export type PanelSessionConfig = {
  assets_base_url?: string;
};

export type PanelSession = {
  token: string;
  user: PanelSessionUser;
  config?: PanelSessionConfig;
  issuedAt: number;
};

type SerializedPanelSession = PanelSession & {
  purpose: typeof PANEL_SESSION_PURPOSE;
};

function getStringBytes(value: string) {
  return new TextEncoder().encode(value);
}

function timingSafeMatch(left: string, right: string) {
  const leftBytes = getStringBytes(left);
  const rightBytes = getStringBytes(right);

  if (leftBytes.length !== rightBytes.length) {
    return false;
  }

  return timingSafeEqual(leftBytes, rightBytes);
}

function signSessionPayload(encodedPayload: string) {
  const { sessionSecret } = getServerRuntimeConfig();

  if (!sessionSecret) {
    return null;
  }

  return createHmac("sha256", sessionSecret)
    .update(encodedPayload)
    .digest("base64url");
}

function isValidSessionUser(user: unknown): user is PanelSessionUser {
  if (!user || typeof user !== "object") {
    return false;
  }

  const candidate = user as Partial<PanelSessionUser>;

  return (
    typeof candidate.id === "number" &&
    typeof candidate.name === "string" &&
    typeof candidate.email === "string" &&
    typeof candidate.role === "string" &&
    typeof candidate.active === "boolean"
  );
}

export const sessionConfig = {
  cookieName: getServerRuntimeConfig().sessionCookieName,
  secure: getServerRuntimeConfig().sessionCookieSecure,
  maxAgeSeconds: 60 * 60 * 8,
} as const;

export function isPanelSessionConfigured() {
  return Boolean(getServerRuntimeConfig().sessionSecret);
}

export function isAuthorizedPanelUser(user: PanelSessionUser) {
  return user.active && isPanelRole(user.role) && isLivePanelRole(user.role);
}

export function createPanelSessionValue(session: Omit<PanelSession, "issuedAt">) {
  const encodedPayload = Buffer.from(
    JSON.stringify({
      purpose: PANEL_SESSION_PURPOSE,
      issuedAt: Date.now(),
      ...session,
    } satisfies SerializedPanelSession),
  ).toString("base64url");
  const signature = signSessionPayload(encodedPayload);

  if (!signature) {
    return null;
  }

  return `${encodedPayload}.${signature}`;
}

export function readPanelSession(value?: string | null) {
  if (!value) {
    return null;
  }

  const [encodedPayload, receivedSignature] = value.split(".");

  if (!encodedPayload || !receivedSignature) {
    return null;
  }

  const expectedSignature = signSessionPayload(encodedPayload);

  if (!expectedSignature || !timingSafeMatch(receivedSignature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<SerializedPanelSession>;

    if (payload.purpose !== PANEL_SESSION_PURPOSE) {
      return null;
    }

    if (typeof payload.issuedAt !== "number") {
      return null;
    }

    if (Date.now() - payload.issuedAt >= sessionConfig.maxAgeSeconds * 1000) {
      return null;
    }

    if (typeof payload.token !== "string" || !isValidSessionUser(payload.user)) {
      return null;
    }

    return {
      token: payload.token,
      user: payload.user,
      config: payload.config,
      issuedAt: payload.issuedAt,
    } satisfies PanelSession;
  } catch {
    return null;
  }
}
