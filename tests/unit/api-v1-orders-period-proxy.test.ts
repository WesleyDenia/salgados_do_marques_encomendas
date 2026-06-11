import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

test("GET /api/v1/admin/orders/period keeps panel auth and query params for planning", async () => {
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
      id: 7,
      name: "Operacional",
      email: "operacional@example.com",
      role: "operacional",
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
        data: [],
        filters: {
          start_date: "2026-05-20",
          end_date: "2026-05-22",
        },
        day_summaries: {},
        summary: {
          orderCount: 0,
          itemQuantity: 0,
          paidCount: 0,
          attentionCount: 0,
          slotCounts: {},
        },
        slot_occupancy: {
          manha: {
            count: 0,
            label: "Manhã",
            context_status: "insufficient_context",
            context_reason:
              "O agregado do período combina vários dias operacionais; consulte a ocupação oficial por dia para validar disponibilidade.",
          },
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
    const request = new NextRequest(
      "http://panel.test/api/v1/admin/orders/period?start_date=2026-05-20&end_date=2026-05-22",
      {
        method: "GET",
        headers: {
          cookie: `${sessionConfig.cookieName}=${sessionValue}`,
        },
      },
    );

    const response = await GET(request, {
      params: Promise.resolve({
        path: ["admin", "orders", "period"],
      }),
    });

    assert.equal(response.status, 200);
    assert.equal(
      capturedUrl,
      "http://backend.test/api/v1/admin/orders/period?start_date=2026-05-20&end_date=2026-05-22",
    );
    assert.equal(capturedAuthorization, "Bearer panel-token");
    assert.deepEqual(await response.json(), {
      data: [],
      filters: {
        start_date: "2026-05-20",
        end_date: "2026-05-22",
      },
      day_summaries: {},
      summary: {
        orderCount: 0,
        itemQuantity: 0,
        paidCount: 0,
        attentionCount: 0,
        slotCounts: {},
      },
      slot_occupancy: {
        manha: {
          count: 0,
          label: "Manhã",
          context_status: "insufficient_context",
          context_reason:
            "O agregado do período combina vários dias operacionais; consulte a ocupação oficial por dia para validar disponibilidade.",
        },
      },
    });
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

test("GET /api/v1/admin/orders/period rejects roles without planning access", async () => {
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
      id: 8,
      name: "Atendimento",
      email: "atendimento@example.com",
      role: "atendimento",
      active: true,
    },
  });

  assert.ok(sessionValue);

  let fetchCalled = false;

  global.fetch = (async () => {
    fetchCalled = true;

    return new Response(JSON.stringify({ data: [] }), {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    });
  }) as typeof fetch;

  try {
    const request = new NextRequest(
      "http://panel.test/api/v1/admin/orders/period?start_date=2026-05-20&end_date=2026-05-22",
      {
        method: "GET",
        headers: {
          cookie: `${sessionConfig.cookieName}=${sessionValue}`,
        },
      },
    );

    const response = await GET(request, {
      params: Promise.resolve({
        path: ["admin", "orders", "period"],
      }),
    });

    assert.equal(response.status, 403);
    assert.equal(fetchCalled, false);
    assert.deepEqual(await response.json(), {
      message: "O seu perfil não tem autorização para realizar este pedido ao backend.",
    });
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
