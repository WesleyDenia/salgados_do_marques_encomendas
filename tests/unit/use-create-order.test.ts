import assert from "node:assert/strict";
import test from "node:test";

import {
  createOrder,
  getOrderProducts,
  getOrders,
  getOrderStores,
} from "@/features/orders/api";
import { apiClient } from "@/lib/api/http";

test("createOrder maps the panel form to the backend contract", async () => {
  const originalPost = apiClient.post;
  let capturedUrl = "";
  let capturedPayload: Record<string, unknown> | null = null;

  apiClient.post = (async (url, payload) => {
    capturedUrl = String(url);
    capturedPayload = payload as Record<string, unknown>;

    return {
      data: {
        data: {
          id: 91,
          status: "placed",
          scheduled_at: "2026-05-20T09:30:00+00:00",
          total: 48,
          notes: capturedPayload?.notes,
          store: {
            id: 3,
            name: "Loja Centro",
          },
          items: [
            {
              id: 1,
              product_id: 12,
              name: "Coxinha",
              quantity: 12,
              total: 48,
            },
          ],
          created_at: "2026-05-12T09:30:00+00:00",
        },
      },
    };
  }) as typeof apiClient.post;

  try {
    const order = await createOrder({
      storeId: 3,
      customerName: "Maria Silva",
      customerContact: "912345678",
      items: [{ productId: 12, quantity: 12 }],
      observations: "Sem picante",
      date: "2026-05-20",
      time: "10:30",
      slot: "manha",
      paymentStatus: "pending",
    });

    assert.equal(capturedUrl, "/orders");
    assert.deepEqual(capturedPayload, {
      store_id: 3,
      customer_name: "Maria Silva",
      customer_contact: "912345678",
      payment_status: "pending",
      slot: "manha",
      scheduled_at: "2026-05-20T09:30:00.000Z",
      notes: "Sem picante",
      items: [{ product_id: 12, quantity: 12 }],
    });
    assert.equal(order.id, 91);
    assert.equal(order.store?.name, "Loja Centro");
    assert.equal(order.items[0]?.productName, "Coxinha");
  } finally {
    apiClient.post = originalPost;
  }
});

test("order queries normalize backend collections for the panel", async () => {
  const originalGet = apiClient.get;

  apiClient.get = (async (url) => {
    if (url === "/orders") {
      throw new Error("Unexpected customer orders endpoint");
    }

    if (url === "/admin/orders") {
      return {
        data: {
          data: [
            {
              id: 11,
              status: "placed",
              payment_status: "pending",
              slot: "manha",
              customer_name: "Ana",
              customer_contact: "919999999",
              scheduled_at: "2026-05-20T09:30:00+00:00",
              total: 18,
              notes: "Slot operacional: Manhã",
              store: { id: 1, name: "Loja A" },
              user: null,
              items: [
                {
                  id: 1,
                  product_id: 7,
                  name: "Rissol",
                  quantity: 6,
                  total: 18,
                },
              ],
              created_at: "2026-05-12T09:30:00+00:00",
            },
          ],
        },
      };
    }

    if (url === "/products") {
      return {
        data: {
          data: [
            {
              id: 7,
              name: "Rissol",
              description: "Carne",
              price: 3,
              active: true,
            },
          ],
        },
      };
    }

    return {
      data: {
        data: [
          {
            id: 1,
            name: "Loja A",
            city: "Porto",
            address: "Rua A",
            accepts_orders: true,
            default_store: true,
          },
        ],
      },
    };
  }) as typeof apiClient.get;

  try {
    const [orders, products, stores] = await Promise.all([
      getOrders(),
      getOrderProducts(),
      getOrderStores(),
    ]);

    assert.equal(orders.data[0]?.items[0]?.productId, 7);
    assert.equal(orders.data[0]?.customerName, "Ana");
    assert.equal(orders.data[0]?.slot, "manha");
    assert.equal(products.data[0]?.name, "Rissol");
    assert.equal(stores.data[0]?.defaultStore, true);
  } finally {
    apiClient.get = originalGet;
  }
});
