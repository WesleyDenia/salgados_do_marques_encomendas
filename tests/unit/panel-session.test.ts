import assert from "node:assert/strict";
import test from "node:test";

import {
  createPanelSessionValue,
  isAuthorizedPanelUser,
  readPanelSession,
} from "@/lib/auth/session";

test("readPanelSession round-trips a signed session", () => {
  process.env.SESSION_SECRET = "test-session-secret";

  const sessionValue = createPanelSessionValue({
    token: "sanctum-token",
    user: {
      id: 1,
      name: "Admin",
      email: "admin@salgados.local",
      role: "admin",
      active: true,
    },
    config: {
      assets_base_url: "https://api.salgadosdomarques.pt",
    },
  });

  assert.ok(sessionValue);
  assert.deepEqual(readPanelSession(sessionValue), {
    token: "sanctum-token",
    user: {
      id: 1,
      name: "Admin",
      email: "admin@salgados.local",
      role: "admin",
      active: true,
    },
    config: {
      assets_base_url: "https://api.salgadosdomarques.pt",
    },
    issuedAt: readPanelSession(sessionValue)?.issuedAt,
  });
});

test("readPanelSession rejects tampered signatures", () => {
  process.env.SESSION_SECRET = "test-session-secret";

  const sessionValue = createPanelSessionValue({
    token: "sanctum-token",
    user: {
      id: 1,
      name: "Admin",
      email: "admin@salgados.local",
      role: "admin",
      active: true,
    },
  });

  assert.ok(sessionValue);
  assert.equal(readPanelSession(`${sessionValue}tampered`), null);
});

test("isAuthorizedPanelUser requires active authorized roles", () => {
  assert.equal(
    isAuthorizedPanelUser({
      id: 1,
      name: "Admin",
      email: "admin@salgados.local",
      role: "admin",
      active: true,
    }),
    true,
  );

  assert.equal(
    isAuthorizedPanelUser({
      id: 2,
      name: "Cliente",
      email: "cliente@salgados.local",
      role: "cliente",
      active: true,
    }),
    false,
  );

  assert.equal(
    isAuthorizedPanelUser({
      id: 3,
      name: "Operacional",
      email: "operacional@salgados.local",
      role: "operacional",
      active: false,
    }),
    false,
  );
});
