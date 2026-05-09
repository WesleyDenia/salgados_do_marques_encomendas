import { cache } from "react";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { authorizePanelRoute } from "@/lib/auth/authorization";
import { readPanelSession, sessionConfig } from "@/lib/auth/session";
import { fetchCurrentPanelUser } from "@/lib/server/auth-boundary";

export const getCurrentPanelRequestState = cache(async () => {
  const cookieStore = await cookies();
  const session = readPanelSession(
    cookieStore.get(sessionConfig.cookieName)?.value,
  );

  if (!session) {
    return {
      session: null,
      currentUser: null,
    };
  }

  const currentUser = await fetchCurrentPanelUser(session);

  return {
    session,
    currentUser,
  };
});

export async function requireCurrentPanelUser() {
  const requestState = await getCurrentPanelRequestState();

  if (!requestState.session || !requestState.currentUser) {
    redirect("/signin");
  }

  return requestState.currentUser;
}

export async function requirePanelRoute(pathname: string) {
  const currentUser = await requireCurrentPanelUser();
  const authorization = authorizePanelRoute(currentUser, pathname);

  if (!authorization.allowed) {
    redirect(authorization.redirectTo);
  }

  return {
    currentUser,
    route: authorization.route,
  };
}
