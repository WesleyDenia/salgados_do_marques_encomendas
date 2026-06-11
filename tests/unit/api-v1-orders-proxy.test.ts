import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

test("POST /api/v1/orders proxies the same-origin payload to the backend with panel auth", async () => {
  const originalFetch = global.fetch;
  const previousSecret = process.env.SESSION_SECRET;
  const previousUpstreamUrl = process.env.SALGADOS_API_UPSTREAM_URL;

  process.env.SESSION_SECRET = "test-session-secret";
  process.env.SALGADOS_API_UPSTREAM_URL = "http://backend.test/api/v1";

  const { createPanelSessionValue, sessionConfig } = await import("@/lib/auth/session");
  const { POST } = await import("@/app/api/v1/[...path]/route");

  const sessionValue = createPanelSessionValue({
    token: "panel-token",
    user: {
      id: 7,
      name: "Atendimento",
      email: "atendimento@example.com",
      role: "atendimento",
      active: true,
    },
  });

  assert.ok(sessionValue);

  let capturedUrl = "";
  let capturedAuthorization = "";
  let capturedBody = "";

  global.fetch = (async (input, init) => {
    capturedUrl = String(input);
    capturedAuthorization = new Headers(init?.headers).get("authorization") ?? "";
    capturedBody = Buffer.from((init?.body as ArrayBuffer | undefined) ?? new ArrayBuffer(0)).toString(
      "utf8",
    );

    return new Response(
      JSON.stringify({
        data: {
          id: 91,
          status: "placed",
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
    const request = new NextRequest("http://panel.test/api/v1/orders", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `${sessionConfig.cookieName}=${sessionValue}`,
      },
      body: JSON.stringify({
        store_id: 3,
        customer_name: "Maria Silva",
        customer_contact: "912345678",
        payment_status: "pending",
        slot: "manha",
        scheduled_at: "2026-05-20T09:30:00.000Z",
        notes: "Sem picante",
        items: [{ product_id: 12, quantity: 12 }],
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({
        path: ["orders"],
      }),
    });

    assert.equal(response.status, 200);
    assert.equal(capturedUrl, "http://backend.test/api/v1/orders");
    assert.equal(capturedAuthorization, "Bearer panel-token");
    assert.deepEqual(JSON.parse(capturedBody), {
      store_id: 3,
      customer_name: "Maria Silva",
      customer_contact: "912345678",
      payment_status: "pending",
      slot: "manha",
      scheduled_at: "2026-05-20T09:30:00.000Z",
      notes: "Sem picante",
      items: [{ product_id: 12, quantity: 12 }],
    });
    assert.deepEqual(await response.json(), {
      data: {
        id: 91,
        status: "placed",
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

test("GET /api/v1/admin/orders/daily keeps panel auth and query params for planning", async () => {
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
          day: "2026-05-20",
        },
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
              "Sem encomendas suficientes neste conjunto para determinar um contexto oficial único de disponibilidade.",
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
      "http://panel.test/api/v1/admin/orders/daily?day=2026-05-20",
      {
        method: "GET",
        headers: {
          cookie: `${sessionConfig.cookieName}=${sessionValue}`,
        },
      },
    );

    const response = await GET(request, {
      params: Promise.resolve({
        path: ["admin", "orders", "daily"],
      }),
    });

    assert.equal(response.status, 200);
    assert.equal(
      capturedUrl,
      "http://backend.test/api/v1/admin/orders/daily?day=2026-05-20",
    );
    assert.equal(capturedAuthorization, "Bearer panel-token");
    assert.deepEqual(await response.json(), {
      data: [],
      filters: {
        day: "2026-05-20",
      },
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
            "Sem encomendas suficientes neste conjunto para determinar um contexto oficial único de disponibilidade.",
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

test("GET /api/v1/admin/orders/weekly keeps panel auth and query params for planning", async () => {
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
          week_start: "2026-05-18",
        },
        day_summaries: {},
        summary: {
          orderCount: 0,
          itemQuantity: 0,
          paidCount: 0,
          attentionCount: 0,
          slotCounts: {},
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
      "http://panel.test/api/v1/admin/orders/weekly?week_start=2026-05-18",
      {
        method: "GET",
        headers: {
          cookie: `${sessionConfig.cookieName}=${sessionValue}`,
        },
      },
    );

    const response = await GET(request, {
      params: Promise.resolve({
        path: ["admin", "orders", "weekly"],
      }),
    });

    assert.equal(response.status, 200);
    assert.equal(
      capturedUrl,
      "http://backend.test/api/v1/admin/orders/weekly?week_start=2026-05-18",
    );
    assert.equal(capturedAuthorization, "Bearer panel-token");
    assert.deepEqual(await response.json(), {
      data: [],
      filters: {
        week_start: "2026-05-18",
      },
      day_summaries: {},
      summary: {
        orderCount: 0,
        itemQuantity: 0,
        paidCount: 0,
        attentionCount: 0,
        slotCounts: {},
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
