import assert from "node:assert/strict";
import test from "node:test";

import {
  authorizePanelRoute,
  canPerform,
  getPanelNavigationItems,
  hasPanelCapability,
} from "@/lib/auth/authorization";
import type { PanelSessionUser } from "@/lib/auth/session";

function createUser(overrides: Partial<PanelSessionUser>): PanelSessionUser {
  return {
    id: 1,
    name: "Painel",
    email: "painel@salgados.local",
    role: "admin",
    active: true,
    ...overrides,
  };
}

test("hasPanelCapability resolves modeled future roles without granting live access", () => {
  assert.equal(hasPanelCapability("admin", "settings:access:manage"), true);
  assert.equal(hasPanelCapability("operacional", "planning:manage"), true);
  assert.equal(hasPanelCapability("operacional", "settings:access:view"), false);
  assert.equal(hasPanelCapability("atendimento", "orders:view"), true);
  assert.equal(hasPanelCapability("atendimento", "orders:create"), true);
  assert.equal(hasPanelCapability("atendimento", "orders:manage"), false);
  assert.equal(hasPanelCapability("desconhecido", "dashboard:view"), false);
});

test("canPerform exposes action-level capability checks", () => {
  assert.equal(canPerform("admin", "orders:create"), true);
  assert.equal(canPerform("operacional", "orders:create"), true);
  assert.equal(canPerform("atendimento", "orders:create"), true);
  assert.equal(canPerform("desconhecido", "orders:create"), false);
});

test("authorizePanelRoute allows live admin access to protected routes", () => {
  const authorization = authorizePanelRoute(
    createUser({ role: "admin" }),
    "/settings/operational",
  );

  assert.equal(authorization.allowed, true);

  if (authorization.allowed) {
    assert.equal(authorization.route.key, "settings-operational");
  }
});

test("authorizePanelRoute allows live runtime roles since backend alignment was added", () => {
  const authorization = authorizePanelRoute(
    createUser({ role: "operacional" }),
    "/planning",
  );

  assert.equal(authorization.allowed, true);
  if (authorization.allowed) {
    assert.equal(authorization.route.key, "planning");
  }
});

test("authorizePanelRoute rejects inactive and unknown users by default", () => {
  const inactiveAuthorization = authorizePanelRoute(
    createUser({ active: false }),
    "/dashboard",
  );
  const unknownAuthorization = authorizePanelRoute(
    createUser({ role: "revendedor" }),
    "/orders",
  );

  assert.equal(inactiveAuthorization.allowed, false);
  assert.equal(
    inactiveAuthorization.allowed ? null : inactiveAuthorization.reason,
    "inactive-user",
  );
  // Redirect to signin with error for inactive
  assert.equal(
    inactiveAuthorization.allowed ? null : inactiveAuthorization.redirectTo,
    "/signin?error=inactive",
  );

  assert.equal(unknownAuthorization.allowed, false);
  assert.equal(
    unknownAuthorization.allowed ? null : unknownAuthorization.reason,
    "unknown-role",
  );
  // Redirect to signin with error for unknown
  assert.equal(
    unknownAuthorization.allowed ? null : unknownAuthorization.redirectTo,
    "/signin?error=unknown_role",
  );
});

test("authorizePanelRoute normalizes pathnames with trailing slashes", () => {
  const authorization = authorizePanelRoute(
    createUser({ role: "admin" }),
    "/orders/",
  );

  assert.equal(authorization.allowed, true);
  if (authorization.allowed) {
    assert.equal(authorization.route.key, "orders");
  }
});

test("getPanelNavigationItems keeps navigation centralized and role-aware", () => {
  assert.deepEqual(
    getPanelNavigationItems("admin").map((item) => item.href),
    [
      "/dashboard",
      "/orders",
      "/planning",
      "/settings/operational",
      "/settings/access",
      "/audit/investigation",
    ],
  );
  assert.deepEqual(
    getPanelNavigationItems("operacional").map((item) => item.href),
    ["/dashboard", "/orders", "/planning"],
  );
  assert.deepEqual(
    getPanelNavigationItems("atendimento").map((item) => item.href),
    ["/dashboard", "/orders"],
  );
});
