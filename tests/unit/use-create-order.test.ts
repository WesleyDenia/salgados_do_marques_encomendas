import assert from "node:assert/strict";
import test from "node:test";

import {
  createOrder,
  getOrderProducts,
  getOrderSettings,
  getOrders,
  getOrderStores,
  updateOrder,
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
      allowScheduleException: true,
      paymentStatus: "pending",
    });

    assert.equal(capturedUrl, "/orders");
    assert.deepEqual(capturedPayload, {
      store_id: 3,
      customer_name: "Maria Silva",
      customer_contact: "912345678",
      tag_ids: [],
      allow_schedule_exception: true,
      payment_status: "pending",
      scheduled_at: "2026-05-20T09:30:00.000Z",
      notes: "Sem picante",
      items: [{ product_id: 12, quantity: 12, flavors: [] }],
    });
    assert.equal(order.id, 91);
    assert.equal(order.store?.name, "Loja Centro");
    assert.equal(order.items[0]?.productName, "Coxinha");
  } finally {
    apiClient.post = originalPost;
  }
});

test("createOrder respects the provided operational timezone", async () => {
  const originalPost = apiClient.post;
  let capturedPayload: Record<string, unknown> | null = null;

  apiClient.post = (async (_url, payload) => {
    capturedPayload = payload as Record<string, unknown>;

    return {
      data: {
        data: {
          id: 92,
          status: "placed",
          scheduled_at: "2026-05-20T10:30:00.000Z",
          total: 12,
          items: [],
          created_at: "2026-05-12T09:30:00.000Z",
        },
      },
    };
  }) as typeof apiClient.post;

  try {
    await createOrder(
      {
        storeId: 3,
        customerName: "Maria Silva",
        customerContact: "912345678",
        items: [{ productId: 12, quantity: 12 }],
      observations: "",
      date: "2026-05-20",
      time: "10:30",
      allowScheduleException: false,
      paymentStatus: "pending",
      },
      "Atlantic/Azores",
    );

    assert.equal(capturedPayload?.scheduled_at, "2026-05-20T10:30:00.000Z");
  } finally {
    apiClient.post = originalPost;
  }
});

test("order queries normalize backend collections for the panel", async () => {
  const originalGet = apiClient.get;
  let capturedSearchParams: Record<string, unknown> | undefined;
  let settingsRequested = false;

  apiClient.get = (async (url, config) => {
    if (url === "/admin/orders") {
      capturedSearchParams = config?.params as Record<string, unknown> | undefined;
    }

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

    if (url === "/orders/settings") {
      settingsRequested = true;

      return {
        data: {
          data: {
            start_time: "12:00",
            end_time: "20:00",
            minimum_minutes: 30,
            cancel_minutes: 60,
            timezone: "Europe/Lisbon",
            scheduling_window_days: 15,
            status_labels: {
              placed: "Realizado",
              accepted: "Aceito",
            },
          },
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
    const [orders, products, stores, settings] = await Promise.all([
      getOrders({
        search: "Ana",
        page: 3,
        status: "accepted",
        scheduledFrom: "2026-05-16T00:00:00.000Z",
        scheduledTo: "2026-05-16T23:59:59.000Z",
      }),
      getOrderProducts(),
      getOrderStores(),
      getOrderSettings(),
    ]);

    assert.deepEqual(capturedSearchParams, {
      search: "Ana",
      page: 3,
      status: "accepted",
      scheduled_from: "2026-05-16T00:00:00.000Z",
      scheduled_to: "2026-05-16T23:59:59.000Z",
    });
    assert.equal(orders.data[0]?.items[0]?.productId, 7);
    assert.equal(orders.data[0]?.customerName, "Ana");
    assert.equal(orders.data[0]?.slot, "manha");
    assert.equal(orders.data[0]?.canEdit, undefined);
    assert.equal(products.data[0]?.name, "Rissol");
    assert.equal(stores.data[0]?.defaultStore, true);
    assert.equal(settingsRequested, true);
    assert.equal(settings.timezone, "Europe/Lisbon");
    assert.equal(settings.statusLabels.accepted, "Aceito");
  } finally {
    apiClient.get = originalGet;
  }
});

test("updateOrder maps correction payloads to the admin backend contract", async () => {
  const originalPatch = apiClient.patch;
  let capturedUrl = "";
  let capturedPayload: Record<string, unknown> | null = null;

  apiClient.patch = (async (url, payload) => {
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
          customer_name: "Maria Silva",
          customer_contact: "912345678",
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
  }) as typeof apiClient.patch;

  try {
    const order = await updateOrder(91, {
      storeId: 3,
      customerName: "Maria Silva",
      customerContact: "912345678",
      items: [{ productId: 12, quantity: 12 }],
      observations: "Sem picante",
      date: "2026-05-20",
      time: "10:30",
      allowScheduleException: true,
      paymentStatus: "pending",
    });

    assert.equal(capturedUrl, "/admin/orders/91");
    assert.deepEqual(capturedPayload, {
      store_id: 3,
      customer_name: "Maria Silva",
      customer_contact: "912345678",
      tag_ids: [],
      allow_schedule_exception: true,
      payment_status: "pending",
      scheduled_at: "2026-05-20T09:30:00.000Z",
      notes: "Sem picante",
      items: [{ product_id: 12, quantity: 12, flavors: [] }],
    });
    assert.equal(order.id, 91);
  } finally {
    apiClient.patch = originalPatch;
  }
});
