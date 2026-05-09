import type { PanelSessionUser } from "@/lib/auth/session";

export const PANEL_ROLES = ["admin", "operacional", "atendimento"] as const;

export type PanelRole = (typeof PANEL_ROLES)[number];

export const PANEL_CAPABILITIES = [
  "dashboard:view",
  "orders:view",
  "orders:manage",
  "planning:view",
  "planning:manage",
  "settings:access:view",
  "settings:access:manage",
  "audit:investigation:view",
  "audit:investigation:manage",
] as const;

export type PanelCapability = (typeof PANEL_CAPABILITIES)[number];

export const PANEL_ROUTE_KEYS = [
  "dashboard",
  "orders",
  "planning",
  "settings-access",
  "audit-investigation",
] as const;

export type PanelRouteKey = (typeof PANEL_ROUTE_KEYS)[number];

export type PanelRouteDefinition = {
  key: PanelRouteKey;
  href: string;
  label: string;
  description: string;
  runtime: "live" | "planned";
  allowedRoles: readonly PanelRole[];
  requiredCapability: PanelCapability;
  primaryCapability?: PanelCapability;
  matcher: (pathname: string) => boolean;
};

type PanelRoleDefinition = {
  role: PanelRole;
  label: string;
  runtime: "live" | "planned";
  capabilities: readonly PanelCapability[];
};

export type PanelRouteAuthorization =
  | {
      allowed: true;
      route: PanelRouteDefinition;
      role: PanelRole;
      runtime: PanelRoleDefinition["runtime"];
    }
  | {
      allowed: false;
      reason:
        | "inactive-user"
        | "unknown-role"
        | "runtime-role-disabled"
        | "missing-capability";
      route: PanelRouteDefinition;
      role: PanelRole | null;
      redirectTo: string;
    };

const PANEL_ROLE_DEFINITIONS: Record<PanelRole, PanelRoleDefinition> = {
  admin: {
    role: "admin",
    label: "Administrador",
    runtime: "live",
    capabilities: PANEL_CAPABILITIES,
  },
  operacional: {
    role: "operacional",
    label: "Operacional",
    runtime: "planned",
    capabilities: [
      "dashboard:view",
      "orders:view",
      "orders:manage",
      "planning:view",
      "planning:manage",
    ],
  },
  atendimento: {
    role: "atendimento",
    label: "Atendimento",
    runtime: "planned",
    capabilities: ["dashboard:view", "orders:view"],
  },
};

export const PANEL_ROUTE_DEFINITIONS: readonly PanelRouteDefinition[] = [
  {
    key: "dashboard",
    href: "/dashboard",
    label: "Painel base",
    description: "Resumo operacional e ponto de entrada da shell protegida.",
    runtime: "live",
    allowedRoles: PANEL_ROLES,
    requiredCapability: "dashboard:view",
    matcher: (pathname) => pathname === "/dashboard",
  },
  {
    key: "orders",
    href: "/orders",
    label: "Encomendas",
    description: "Fila operacional e detalhe de encomendas.",
    runtime: "live",
    allowedRoles: PANEL_ROLES,
    requiredCapability: "orders:view",
    primaryCapability: "orders:manage",
    matcher: (pathname) => pathname === "/orders" || pathname.startsWith("/orders/"),
  },
  {
    key: "planning",
    href: "/planning",
    label: "Slots e planeamento",
    description: "Capacidade, ocupação e gestão de janelas operacionais.",
    runtime: "live",
    allowedRoles: ["admin", "operacional"],
    requiredCapability: "planning:view",
    primaryCapability: "planning:manage",
    matcher: (pathname) =>
      pathname === "/planning" || pathname.startsWith("/planning/"),
  },
  {
    key: "settings-access",
    href: "/settings/access",
    label: "Definições e acessos",
    description: "Governança de perfis, acessos e configuração administrativa.",
    runtime: "live",
    allowedRoles: ["admin"],
    requiredCapability: "settings:access:view",
    primaryCapability: "settings:access:manage",
    matcher: (pathname) =>
      pathname === "/settings/access" || pathname.startsWith("/settings/access/"),
  },
  {
    key: "audit-investigation",
    href: "/audit/investigation",
    label: "Auditoria e investigação",
    description: "Rastreio operacional, troubleshooting e trilho de auditoria.",
    runtime: "live",
    allowedRoles: ["admin"],
    requiredCapability: "audit:investigation:view",
    primaryCapability: "audit:investigation:manage",
    matcher: (pathname) =>
      pathname === "/audit/investigation" ||
      pathname.startsWith("/audit/investigation/"),
  },
] as const;

function getRoleDefinition(role: string): PanelRoleDefinition | null {
  return isPanelRole(role) ? PANEL_ROLE_DEFINITIONS[role] : null;
}

export function isPanelRole(role: string): role is PanelRole {
  return Object.hasOwn(PANEL_ROLE_DEFINITIONS, role);
}

export function isLivePanelRole(role: string) {
  return getRoleDefinition(role)?.runtime === "live";
}

export function getPanelRoleLabel(role: string) {
  return getRoleDefinition(role)?.label ?? "Perfil desconhecido";
}

export function getPanelRoleRuntime(role: string) {
  return getRoleDefinition(role)?.runtime ?? null;
}

export function getPanelCapabilities(role: string) {
  return getRoleDefinition(role)?.capabilities ?? [];
}

export function hasPanelCapability(role: string, capability: PanelCapability) {
  return getPanelCapabilities(role).includes(capability);
}

export function getPanelRouteDefinition(pathname: string) {
  const normalizedPathname = pathname === "/" ? "/" : pathname.replace(/\/$/, "");

  return (
    PANEL_ROUTE_DEFINITIONS.find((definition) =>
      definition.matcher(normalizedPathname),
    ) ?? null
  );
}

export function getPanelNavigationItems(role: string) {
  if (!isPanelRole(role)) {
    return [];
  }

  return PANEL_ROUTE_DEFINITIONS.filter((route) =>
    route.allowedRoles.includes(role),
  )
    .map((route) => ({
      href: route.href,
      label: route.label,
      description: route.description,
      runtime: route.runtime,
      visible: hasPanelCapability(role, route.requiredCapability),
    }))
    .filter((route) => route.visible);
}

export function getDefaultPanelRoute(role: string) {
  return getPanelNavigationItems(role)[0]?.href ?? "/unauthorized";
}

export function getPanelPrimaryActionState(
  role: string,
  routeKey: PanelRouteKey,
) {
  const route = PANEL_ROUTE_DEFINITIONS.find((item) => item.key === routeKey);

  if (!route || !route.primaryCapability) {
    return null;
  }

  return {
    capability: route.primaryCapability,
    enabled: hasPanelCapability(role, route.primaryCapability),
  };
}

export function authorizePanelRoute(
  user: PanelSessionUser,
  pathname: string,
): PanelRouteAuthorization {
  const normalizedPathname = pathname === "/" ? "/" : pathname.replace(/\/$/, "");
  const route = getPanelRouteDefinition(normalizedPathname);

  if (!route) {
    return {
      allowed: false,
      reason: "missing-capability",
      route: PANEL_ROUTE_DEFINITIONS[0],
      role: isPanelRole(user.role) ? user.role : null,
      redirectTo: "/unauthorized",
    };
  }

  if (!user.active) {
    return {
      allowed: false,
      reason: "inactive-user",
      route,
      role: isPanelRole(user.role) ? user.role : null,
      redirectTo: `/signin?error=inactive`,
    };
  }

  const role = isPanelRole(user.role) ? user.role : null;

  if (!role) {
    return {
      allowed: false,
      reason: "unknown-role",
      route,
      role: null,
      redirectTo: `/signin?error=unknown_role`,
    };
  }

  const roleDefinition = PANEL_ROLE_DEFINITIONS[role];

  if (roleDefinition.runtime !== "live") {
    return {
      allowed: false,
      reason: "runtime-role-disabled",
      route,
      role,
      redirectTo: `/unauthorized?from=${encodeURIComponent(normalizedPathname)}`,
    };
  }

  if (!hasPanelCapability(role, route.requiredCapability)) {
    return {
      allowed: false,
      reason: "missing-capability",
      route,
      role,
      redirectTo: getDefaultPanelRoute(role),
    };
  }

  return {
    allowed: true,
    route,
    role,
    runtime: roleDefinition.runtime,
  };
}
