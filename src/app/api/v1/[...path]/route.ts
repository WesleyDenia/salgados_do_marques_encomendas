import { NextResponse, type NextRequest } from "next/server";

import { authorizePanelRoute, canPerform } from "@/lib/auth/authorization";
import {
  createPanelSessionValue,
  isAuthorizedPanelUser,
  isPanelSessionConfigured,
  readPanelSession,
  sessionConfig,
  type PanelSession,
  type PanelSessionConfig,
  type PanelSessionUser,
} from "@/lib/auth/session";
import {
  getLoginFailureMessage,
  parseUpstreamUser,
  readJsonResponse,
} from "@/lib/server/auth-boundary";
import { getServerRuntimeConfig } from "@/lib/server/env";

type ProxyRouteContext = {
  params: Promise<{ path?: string[] }>;
};

type UpstreamAuthPayload = {
  token: string;
  user: PanelSessionUser;
  config?: PanelSessionConfig;
};

const REQUEST_HEADER_ALLOWLIST = [
  "accept",
  "accept-language",
  "content-type",
  "if-match",
  "if-none-match",
  "user-agent",
  "x-request-id",
] as const;

const RESPONSE_HEADER_ALLOWLIST = [
  "cache-control",
  "content-language",
  "content-type",
  "etag",
  "last-modified",
  "location",
  "vary",
  "x-request-id",
] as const;

function canHaveBody(method: string) {
  return !["GET", "HEAD"].includes(method);
}

function buildUpstreamUrl(request: NextRequest, pathSegments: string[]) {
  const { apiUpstreamUrl } = getServerRuntimeConfig();
  const upstreamUrl = new URL(apiUpstreamUrl);
  const upstreamPath = pathSegments.join("/");

  upstreamUrl.pathname = `${upstreamUrl.pathname.replace(/\/$/, "")}/${upstreamPath}`;
  upstreamUrl.search = request.nextUrl.search;

  return upstreamUrl;
}

function buildUpstreamHeaders(
  request: NextRequest,
  bearerToken?: string,
) {
  const headers = new Headers();

  for (const header of REQUEST_HEADER_ALLOWLIST) {
    const value = request.headers.get(header);

    if (value) {
      headers.set(header, value);
    }
  }

  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }

  if (bearerToken) {
    headers.set("authorization", `Bearer ${bearerToken}`);
  }

  headers.set("x-forwarded-host", request.nextUrl.host);
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));

  return headers;
}

function buildClientHeaders(headers: Headers) {
  const clientHeaders = new Headers();

  for (const header of RESPONSE_HEADER_ALLOWLIST) {
    const value = headers.get(header);

    if (value) {
      clientHeaders.set(header, value);
    }
  }

  return clientHeaders;
}

function buildSessionCookieValue(authPayload: UpstreamAuthPayload) {
  return createPanelSessionValue({
    token: authPayload.token,
    user: authPayload.user,
    config: authPayload.config,
  });
}

function clearSessionCookie(response: NextResponse) {
  response.cookies.set(sessionConfig.cookieName, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: sessionConfig.secure,
  });

  return response;
}

function attachSessionCookie(
  response: NextResponse,
  authPayload: UpstreamAuthPayload,
) {
  const sessionValue = buildSessionCookieValue(authPayload);

  if (!sessionValue) {
    return NextResponse.json(
      {
        message:
          "SESSION_SECRET não está configurado no servidor do painel.",
      },
      { status: 500 },
    );
  }

  response.cookies.set(sessionConfig.cookieName, sessionValue, {
    httpOnly: true,
    maxAge: sessionConfig.maxAgeSeconds,
    path: "/",
    sameSite: "lax",
    secure: sessionConfig.secure,
  });

  return response;
}

function parseUpstreamAuthPayload(data: unknown): UpstreamAuthPayload | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const token = Reflect.get(data, "token");
  const user = Reflect.get(data, "user");
  const config = Reflect.get(data, "config");

  const parsedUser = parseUpstreamUser(user);

  if (typeof token !== "string" || !parsedUser) {
    return null;
  }

  return {
    token,
    user: parsedUser,
    config:
      config && typeof config === "object"
        ? (config as PanelSessionConfig)
        : undefined,
  };
}

function isLoginRoute(method: string, path: string) {
  return method === "POST" && path === "login";
}

function isLogoutRoute(method: string, path: string) {
  return method === "POST" && path === "logout";
}

function isRefreshRoute(method: string, path: string) {
  return method === "POST" && path === "auth/refresh";
}

async function executeUpstreamRequest(
  request: NextRequest,
  pathSegments: string[],
  body: ArrayBuffer | undefined,
  bearerToken?: string,
) {
  return fetch(buildUpstreamUrl(request, pathSegments), {
    method: request.method,
    headers: buildUpstreamHeaders(request, bearerToken),
    body,
    redirect: "manual",
    cache: "no-store",
  });
}

async function revokeUnauthorizedToken(request: NextRequest, token: string) {
  try {
    await fetch(buildUpstreamUrl(request, ["logout"]), {
      method: "POST",
      headers: buildUpstreamHeaders(request, token),
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    return;
  }
}

async function refreshPanelSession(
  request: NextRequest,
  session: PanelSession,
) {
  try {
    const upstreamResponse = await fetch(buildUpstreamUrl(request, ["auth", "refresh"]), {
      method: "POST",
      headers: buildUpstreamHeaders(request, session.token),
      redirect: "manual",
      cache: "no-store",
    });

    if (!upstreamResponse.ok) {
      return null;
    }

    const authPayload = parseUpstreamAuthPayload(
      await readJsonResponse(upstreamResponse),
    );

    if (!authPayload || !isAuthorizedPanelUser(authPayload.user)) {
      if (authPayload?.token) {
        await revokeUnauthorizedToken(request, authPayload.token);
      }

      return null;
    }

    return authPayload;
  } catch {
    return null;
  }
}

async function handleLogin(
  request: NextRequest,
  pathSegments: string[],
  body: ArrayBuffer | undefined,
) {
  if (!isPanelSessionConfigured()) {
    return NextResponse.json(
      {
        message: "SESSION_SECRET não está configurado no servidor do painel.",
      },
      { status: 500 },
    );
  }

  const upstreamResponse = await executeUpstreamRequest(
    request,
    pathSegments,
    body,
  );
  const upstreamJson = await readJsonResponse(upstreamResponse);

  if (!upstreamResponse.ok) {
    return NextResponse.json(
      {
        message: getLoginFailureMessage(upstreamResponse.status),
      },
      { status: upstreamResponse.status },
    );
  }

  const authPayload = parseUpstreamAuthPayload(upstreamJson);

  if (!authPayload) {
    return NextResponse.json(
      {
        message:
          "O backend devolveu uma resposta de autenticação inválida para o painel.",
      },
      { status: 502 },
    );
  }

  if (!isAuthorizedPanelUser(authPayload.user)) {
    await revokeUnauthorizedToken(request, authPayload.token);

    return NextResponse.json(
      {
        message: getLoginFailureMessage(403),
      },
      { status: 403 },
    );
  }

  const response = NextResponse.json({
    user: authPayload.user,
    config: authPayload.config ?? null,
  });

  return attachSessionCookie(response, authPayload);
}

async function handleLogout(request: NextRequest) {
  const session = readPanelSession(
    request.cookies.get(sessionConfig.cookieName)?.value,
  );

  if (session) {
    try {
      await fetch(buildUpstreamUrl(request, ["logout"]), {
        method: "POST",
        headers: buildUpstreamHeaders(request, session.token),
        redirect: "manual",
        cache: "no-store",
      });
    } catch {
      // Best effort only; the panel cookie is still cleared below.
    }
  }

  return clearSessionCookie(
    NextResponse.json({
      message: "Sessão terminada.",
    }),
  );
}

async function handleExplicitRefresh(request: NextRequest) {
  const session = readPanelSession(
    request.cookies.get(sessionConfig.cookieName)?.value,
  );

  if (!session) {
    return clearSessionCookie(
      NextResponse.json(
        {
          message: "A sessão autenticada expirou ou deixou de ser válida.",
        },
        { status: 401 },
      ),
    );
  }

  const authPayload = await refreshPanelSession(request, session);

  if (!authPayload) {
    return clearSessionCookie(
      NextResponse.json(
        {
          message: "A sessão autenticada expirou ou deixou de ser válida.",
        },
        { status: 401 },
      ),
    );
  }

  return attachSessionCookie(
    NextResponse.json({
      user: authPayload.user,
      config: authPayload.config ?? null,
    }),
    authPayload,
  );
}

function buildProxyResponse(upstreamResponse: Response) {
  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: buildClientHeaders(upstreamResponse.headers),
  });
}

function authorizeApiProxy(
  session: PanelSession,
  pathSegments: string[],
  method: string,
) {
  const primarySegment = pathSegments[0];
  const secondarySegment = pathSegments[1];
  
  // Routes that are always allowed if authenticated (self-management)
  if (primarySegment === "me") {
    return true;
  }

  if (primarySegment === "admin") {
    if (secondarySegment === "orders") {
      return authorizePanelRoute(session.user, "/orders").allowed;
    }

    if (secondarySegment === "users" || secondarySegment === "roles") {
      return authorizePanelRoute(session.user, "/settings/access").allowed;
    }
  }

  // Map API segments to frontend routes for capability validation
  const pathMap: Record<string, string> = {
    orders: "/orders",
    planning: "/planning",
    slots: "/planning",
    users: "/settings/access",
    roles: "/settings/access",
    audit: "/audit/investigation",
    logs: "/audit/investigation",
  };

  const targetPath = pathMap[primarySegment];

  if (primarySegment === "orders" && method === "POST") {
    return canPerform(session.user.role, "orders:create");
  }

  if (!targetPath) {
    // If we don't know the mapping, we default to dashboard view check as baseline
    return authorizePanelRoute(session.user, "/dashboard").allowed;
  }

  return authorizePanelRoute(session.user, targetPath).allowed;
}

async function handleSessionAwareProxy(
  request: NextRequest,
  pathSegments: string[],
  body: ArrayBuffer | undefined,
) {
  const session = readPanelSession(
    request.cookies.get(sessionConfig.cookieName)?.value,
  );

  if (!session) {
    return clearSessionCookie(
      NextResponse.json(
        {
          message: "Sessão não encontrada ou inválida.",
        },
        { status: 401 },
      ),
    );
  }

  // Defense in depth: validate panel authorization before proxying to backend
  if (!authorizeApiProxy(session, pathSegments, request.method)) {
    return NextResponse.json(
      {
        message: "O seu perfil não tem autorização para realizar este pedido ao backend.",
      },
      { status: 403 },
    );
  }

  let upstreamResponse = await executeUpstreamRequest(
    request,
    pathSegments,
    body,
    session.token,
  );
  let refreshedAuthPayload: UpstreamAuthPayload | null = null;

  if (upstreamResponse.status === 401) {
    refreshedAuthPayload = await refreshPanelSession(request, session);

    if (!refreshedAuthPayload) {
      return clearSessionCookie(
        NextResponse.json(
          {
            message: "A sessão autenticada expirou ou deixou de ser válida.",
          },
          { status: 401 },
        ),
      );
    }

    upstreamResponse = await executeUpstreamRequest(
      request,
      pathSegments,
      body,
      refreshedAuthPayload.token,
    );
  }

  const responsePath = pathSegments.join("/");

  if (responsePath === "me" && upstreamResponse.ok) {
    const upstreamUser = parseUpstreamUser(await readJsonResponse(upstreamResponse));

    if (!upstreamUser || !isAuthorizedPanelUser(upstreamUser)) {
      return clearSessionCookie(
        NextResponse.json(
          {
            message: "O utilizador autenticado deixou de ter acesso ao painel.",
          },
          { status: 403 },
        ),
      );
    }

    const nextSessionPayload = refreshedAuthPayload
      ? {
          ...refreshedAuthPayload,
          user: upstreamUser,
        }
      : {
          token: session.token,
          user: upstreamUser,
          config: session.config,
        };

    const response = NextResponse.json(upstreamUser);

    return attachSessionCookie(response, nextSessionPayload);
  }

  const response = buildProxyResponse(upstreamResponse);

  return refreshedAuthPayload
    ? attachSessionCookie(response, refreshedAuthPayload)
    : response;
}

async function proxyRequest(request: NextRequest, context: ProxyRouteContext) {
  const { path = [] } = await context.params;
  const pathKey = path.join("/");
  const body = canHaveBody(request.method)
    ? await request.arrayBuffer()
    : undefined;

  try {
    if (isLoginRoute(request.method, pathKey)) {
      return handleLogin(request, path, body);
    }

    if (isLogoutRoute(request.method, pathKey)) {
      return handleLogout(request);
    }

    if (isRefreshRoute(request.method, pathKey)) {
      return handleExplicitRefresh(request);
    }

    return handleSessionAwareProxy(request, path, body);
  } catch (error) {
    return NextResponse.json(
      {
        message: "Falha ao contactar o upstream configurado do salgados-api.",
        detail:
          error instanceof Error ? error.message : "Erro desconhecido no proxy.",
      },
      { status: 502 },
    );
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest, context: ProxyRouteContext) {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: ProxyRouteContext) {
  return proxyRequest(request, context);
}

export async function PUT(request: NextRequest, context: ProxyRouteContext) {
  return proxyRequest(request, context);
}

export async function PATCH(request: NextRequest, context: ProxyRouteContext) {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: ProxyRouteContext) {
  return proxyRequest(request, context);
}
