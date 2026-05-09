export function getServerRuntimeConfig() {
  return {
    apiUpstreamUrl:
      process.env.SALGADOS_API_UPSTREAM_URL ?? "http://localhost:8000/api/v1",
    sessionCookieName:
      process.env.SESSION_COOKIE_NAME ?? "salgados_panel_session",
    sessionCookieSecure: process.env.SESSION_COOKIE_SECURE === "true",
    sessionSecret: process.env.SESSION_SECRET ?? null,
  };
}
