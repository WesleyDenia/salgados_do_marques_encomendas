import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

test("GET /api/v1/admin/planning/slot-capacities allows admin access and preserves panel auth", async () => {
  const originalFetch = global.fetch;
  const previousSecret = process.env.SESSION_SECRET;
  const previousUpstreamUrl = process.env.SALGADOS_API_UPSTREAM_URL;

  process.env.SESSION_SECRET = "test-session-secret";
  process.env.SALGADOS_API_UPSTREAM_URL = "http://backend.test/api/v1";

  const { createPanelSessionValue, sessionConfig } = await import("@/lib/auth/session");
  const { GET } = await import("@/app/api/v1/[...path]/route");

  const sessionValue = createPanelSessionValue({
    token: "panel-token",
    user: {
      id: 1,
      name: "Administrador",
      email: "admin@example.com",
      role: "admin",
      active: true,
    },
  });

  assert.ok(sessionValue);

  let capturedUrl = "";
  let capturedAuthorization = "";

  global.fetch = (async (input, init) => {
    capturedUrl = String(input);
    capturedAuthorization = new Headers(init?.headers).get("authorization") ?? "";

    return new Response(
      JSON.stringify({
        data: {
          scope: "global",
          setting_key: "ORDER_SLOT_BASE_CAPACITY",
          slot_capacities: [],
        },
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      },
    );
  }) as typeof fetch;

  try {
    const request = new NextRequest("http://panel.test/api/v1/admin/planning/slot-capacities", {
      method: "GET",
      headers: {
        cookie: `${sessionConfig.cookieName}=${sessionValue}`,
      },
    });

    const response = await GET(request, {
      params: Promise.resolve({
        path: ["admin", "planning", "slot-capacities"],
      }),
    });

    assert.equal(response.status, 200);
    assert.equal(capturedUrl, "http://backend.test/api/v1/admin/planning/slot-capacities");
    assert.equal(capturedAuthorization, "Bearer panel-token");
  } finally {
    global.fetch = originalFetch;

    if (previousSecret === undefined) {
      delete process.env.SESSION_SECRET;
    } else {
      process.env.SESSION_SECRET = previousSecret;
    }

    if (previousUpstreamUrl === undefined) {
      delete process.env.SALGADOS_API_UPSTREAM_URL;
    } else {
      process.env.SALGADOS_API_UPSTREAM_URL = previousUpstreamUrl;
    }
  }
});

test("PUT /api/v1/admin/planning/slot-capacities rejects operacional role at the same-origin boundary", async () => {
  const previousSecret = process.env.SESSION_SECRET;
  const previousUpstreamUrl = process.env.SALGADOS_API_UPSTREAM_URL;

  process.env.SESSION_SECRET = "test-session-secret";
  process.env.SALGADOS_API_UPSTREAM_URL = "http://backend.test/api/v1";

  const { createPanelSessionValue, sessionConfig } = await import("@/lib/auth/session");
  const { PUT } = await import("@/app/api/v1/[...path]/route");

  const sessionValue = createPanelSessionValue({
    token: "panel-token",
    user: {
      id: 7,
      name: "Operacional",
      email: "operacional@example.com",
      role: "operacional",
      active: true,
    },
  });

  assert.ok(sessionValue);

  try {
    const request = new NextRequest("http://panel.test/api/v1/admin/planning/slot-capacities", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        cookie: `${sessionConfig.cookieName}=${sessionValue}`,
      },
      body: JSON.stringify({
        manha: 1,
        tarde: 1,
        noite: 1,
      }),
    });

    const response = await PUT(request, {
      params: Promise.resolve({
        path: ["admin", "planning", "slot-capacities"],
      }),
    });

    assert.equal(response.status, 403);
    assert.match(JSON.stringify(await response.json()), /não tem autorização/i);
  } finally {
    if (previousSecret === undefined) {
      delete process.env.SESSION_SECRET;
    } else {
      process.env.SESSION_SECRET = previousSecret;
    }

    if (previousUpstreamUrl === undefined) {
      delete process.env.SALGADOS_API_UPSTREAM_URL;
    } else {
      process.env.SALGADOS_API_UPSTREAM_URL = previousUpstreamUrl;
    }
  }
});
