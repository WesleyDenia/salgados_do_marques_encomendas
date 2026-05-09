import assert from "node:assert/strict";
import test from "node:test";

import {
  getLoginFailureMessage,
  parseUpstreamUser,
} from "@/lib/server/auth-boundary";

test("parseUpstreamUser accepts Laravel JsonResource envelopes", () => {
  const user = parseUpstreamUser({
    data: {
      id: 1,
      name: "Admin",
      email: "admin@salgados.local",
      role: "admin",
      active: true,
    },
  });

  assert.deepEqual(user, {
    id: 1,
    name: "Admin",
    email: "admin@salgados.local",
    role: "admin",
    active: true,
  });
});

test("parseUpstreamUser rejects incomplete payloads", () => {
  assert.equal(
    parseUpstreamUser({
      data: {
        id: 1,
        name: "Admin",
      },
    }),
    null,
  );
});

test("getLoginFailureMessage never forwards upstream details", () => {
  assert.equal(
    getLoginFailureMessage(401),
    "Não foi possível autenticar no painel com as credenciais fornecidas.",
  );
  assert.equal(
    getLoginFailureMessage(500),
    "Não foi possível concluir o login no painel neste momento.",
  );
});
