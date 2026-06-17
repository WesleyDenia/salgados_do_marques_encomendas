import assert from "node:assert/strict";
import test from "node:test";

import { normalizeOrderResource } from "@/features/orders/api";

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
