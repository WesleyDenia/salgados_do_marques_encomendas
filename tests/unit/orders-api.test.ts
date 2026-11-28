import assert from "node:assert/strict";
import test from "node:test";

import { getOrders, normalizeOrderResource } from "@/features/orders/api";
import { apiClient } from "@/lib/api/http";

test("getOrders sends the selected store as the admin search filter", async () => {
  const originalGet = apiClient.get;
  let capturedParams: Record<string, unknown> | undefined;

  apiClient.get = (async (_url, config) => {
    capturedParams = config?.params as Record<string, unknown> | undefined;
    return { data: { data: [] } };
  }) as typeof apiClient.get;

  try {
    await getOrders({ storeId: 7 });

    assert.equal(capturedParams?.store_id, 7);
  } finally {
    apiClient.get = originalGet;
  }
});

test("normalizeOrderResource preserves order history for future investigation flows", () => {
  const order = normalizeOrderResource({
    id: 42,
    status: "placed",
    payment_status: "pending",
    slot: "manha",
    customer_name: "Maria Silva",
    customer_contact: "912345678",
    scheduled_at: "2026-05-20T09:30:00.000Z",
    total: 24,
    notes: "Sem picante",
    created_at: "2026-05-12T09:30:00.000Z",
    items: [],
    store: null,
    user: null,
    history: [
      {
        id: 7,
        user_id: 3,
        user: {
          id: 3,
          name: "Supervisor",
          email: "supervisor@example.com",
        },
        action: "status_changed",
        changes: {
          status: {
            from: "placed",
            to: "accepted",
          },
        },
        created_at: "2026-05-21T11:00:00.000Z",
      },
    ],
  });

  assert.deepEqual(order.history, [
    {
      id: 7,
      userId: 3,
      user: {
        id: 3,
        name: "Supervisor",
        email: "supervisor@example.com",
      },
      action: "status_changed",
      changes: {
        status: {
          from: "placed",
          to: "accepted",
        },
      },
      createdAt: "2026-05-21T11:00:00.000Z",
    },
  ]);
});

test("normalizeOrderResource reinterprets operational API timestamps to preserve Lisbon wall-clock time", () => {
  const order = normalizeOrderResource({
    id: 77,
    status: "placed",
    payment_status: "pending",
    slot: "tarde",
    customer_name: "Ana",
    customer_contact: "919999999",
    scheduled_at: "2026-06-17T14:00:00+01:00",
    total: 18,
    notes: null,
    created_at: "2026-06-17T13:00:00+01:00",
    items: [],
    store: null,
    user: null,
    history: [],
  });

  assert.equal(order.scheduledAt, "2026-06-17T14:00:00.000Z");
  assert.equal(order.createdAt, "2026-06-17T13:00:00.000Z");
});

test("normalizeOrderResource keeps derivation and partial withdrawal metadata for operational follow-up", () => {
  const order = normalizeOrderResource({
    id: 88,
    parent_order_id: 41,
    parent_order: {
      id: 41,
      status: "accepted",
    },
    status: "placed",
    payment_status: "pending",
    slot: "noite",
    customer_name: "Carla",
    customer_contact: "918888888",
    scheduled_at: "2026-07-02T18:00:00.000Z",
    total: 30,
    notes: "Derivada",
    created_at: "2026-07-02T10:00:00.000Z",
    items: [
      {
        id: 9,
        parent_order_item_id: 5,
        product_id: 3,
        name: "Pack Festa",
        quantity: 25,
        total: 30,
        original_units: 25,
        withdrawn_units: 0,
        remaining_units: 25,
        can_withdraw_partially: false,
      },
    ],
    partial_withdrawals: [
      {
        id: 3,
        parent_order_item_id: 5,
        generated_order_id: 88,
        requested_units: 25,
        flavor_ids: [7],
        flavor_names: ["Frango"],
        scheduled_at: "2026-07-02T18:00:00.000Z",
        status: "planned",
      },
    ],
    store: null,
    user: null,
    history: [],
  });

  assert.equal(order.parentOrderId, 41);
  assert.equal(order.parentOrder?.id, 41);
  assert.equal(order.items[0]?.parentOrderItemId, 5);
  assert.equal(order.partialWithdrawals?.[0]?.generatedOrderId, 88);
  assert.deepEqual(order.partialWithdrawals?.[0]?.flavorNames, ["Frango"]);
});

test("normalizeOrderResource keeps the frozen pack flag for operational displays", () => {
  const order = normalizeOrderResource({
    id: 89,
    status: "placed",
    items: [
      {
        id: 10,
        product_id: 3,
        name: "Pack 50 Unidades",
        quantity: 1,
        total: 15,
        options: {
          flavors: [7],
          flavor_names: ["Kibe"],
          is_frozen: true,
        },
      },
    ],
    store: null,
    user: null,
    history: [],
  });

  assert.equal(order.items[0]?.isFrozen, true);
  assert.deepEqual(order.items[0]?.flavorNames, ["Kibe"]);
});
