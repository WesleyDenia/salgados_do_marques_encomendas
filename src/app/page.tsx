import { redirect } from "next/navigation";

import { authorizePanelRoute } from "@/lib/auth/authorization";
import { getCurrentPanelRequestState } from "@/lib/server/panel-access";

export default async function HomePage() {
  const { currentUser } = await getCurrentPanelRequestState();

  if (!currentUser) {
    redirect("/signin");
  }

  const access = authorizePanelRoute(currentUser, "/dashboard");

  redirect(access.allowed ? "/dashboard" : access.redirectTo);
}
