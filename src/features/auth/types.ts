import type { PanelSessionConfig, PanelSessionUser } from "@/lib/auth/session";

export type LoginResponse = {
  user: PanelSessionUser;
  config: PanelSessionConfig | null;
};
