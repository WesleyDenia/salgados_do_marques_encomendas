import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";

import { updateOrder, updateOrderStatus } from "@/features/orders/api";
import {
  handleConfirmedOrderStatusUpdate,
  invalidateOrderQueries,
  invalidateOrderWriteQueries,
  synchronizeConfirmedOrderCaches,
} from "@/features/orders/hooks/use-order-mutations";
import { orderKeys } from "@/features/orders/hooks/use-order-queries";
import { apiClient } from "@/lib/api/http";
import { performOrderStatusTransition } from "@/features/orders/components/orders-operational-record";

test("updateOrder maps the panel form to the backend PATCH contract", async () => {
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
        customer_name: capturedPayload?.customer_name,
        scheduled_at: "2026-05-20T10:30:00.000Z",
        total: 60,
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
            quantity: 15,
            total: 60,
          },
        ],
        created_at: "2026-05-12T09:30:00.000Z",
      },
    },
  };
  }) as typeof apiClient.patch;
  try {
    const order = await updateOrder(91, {
      storeId: 3,
      customerName: "Maria Silva Alterada",
      customerContact: "912345678",
      items: [{ productId: 12, quantity: 15 }],
      observations: "Com mais picante",
      date: "2026-05-20",
      time: "10:30",
      slot: "manha",
      paymentStatus: "paid",
    });

    assert.equal(capturedUrl, "/admin/orders/91");
    assert.deepEqual(capturedPayload, {
      store_id: 3,
      customer_name: "Maria Silva Alterada",
      customer_contact: "912345678",
      payment_status: "paid",
      slot: "manha",
      scheduled_at: "2026-05-20T09:30:00.000Z",
      notes: "Com mais picante",
      items: [{ product_id: 12, quantity: 15, flavors: [] }],
    });
    assert.equal(order.id, 91);
    assert.equal(order.customerName, "Maria Silva Alterada");
    assert.equal(order.items[0]?.quantity, 15);
  } finally {
    apiClient.patch = originalPatch;
  }
});

test("invalidateOrderQueries refreshes both the aggregate and detail order caches", async () => {
  const queryClient = new QueryClient();
  const invalidated: unknown[] = [];
  const originalInvalidate = queryClient.invalidateQueries.bind(queryClient);

  queryClient.invalidateQueries = (async (filters) => {
    invalidated.push(filters.queryKey);
    return originalInvalidate(filters);
  }) as typeof queryClient.invalidateQueries;

  await invalidateOrderQueries(queryClient, 91);

  assert.deepEqual(invalidated, [
    ["orders", "list"],
    ["orders", "search"],
    ["orders", "detail", "91"],
  ]);
});

test("invalidateOrderWriteQueries refreshes orders, detail and slot caches", async () => {
  const queryClient = new QueryClient();
  const invalidated: unknown[] = [];
  const originalInvalidate = queryClient.invalidateQueries.bind(queryClient);

  queryClient.invalidateQueries = (async (filters) => {
    invalidated.push(filters.queryKey);
    return originalInvalidate(filters);
  }) as typeof queryClient.invalidateQueries;

  await invalidateOrderWriteQueries(queryClient, 91);

  assert.deepEqual(invalidated, [
    ["orders", "list"],
    ["orders", "search"],
    ["orders", "detail", "91"],
    ["slots"],
  ]);
});

test("updateOrderStatus sends the status-only PATCH contract and normalizes the response", async () => {
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
          status: "accepted",
          can_edit: true,
          customer_name: "Maria Silva Alterada",
          customer_contact: "912345678",
          scheduled_at: "2026-05-20T10:30:00.000Z",
          total: 60,
          notes: "Com mais picante",
          store: {
            id: 3,
            name: "Loja Centro",
          },
          items: [
            {
              id: 1,
              product_id: 12,
              name: "Coxinha",
              quantity: 15,
              total: 60,
            },
          ],
          created_at: "2026-05-12T09:30:00.000Z",
        },
      },
    };
  }) as typeof apiClient.patch;

  try {
    const order = await updateOrderStatus(91, "accepted");

    assert.equal(capturedUrl, "/admin/orders/91/status");
    assert.deepEqual(capturedPayload, { status: "accepted" });
    assert.equal(order.status, "accepted");
    assert.equal(order.canEdit, true);
  } finally {
    apiClient.patch = originalPatch;
  }
});

test("synchronizeConfirmedOrderCaches updates detail and in-memory queue entries with backend-confirmed data", () => {
  const queryClient = new QueryClient();
  const updatedOrder = {
    id: 91,
    status: "accepted",
    canEdit: false,
    customerName: "Maria Silva Alterada",
    items: [],
  };

  queryClient.setQueryData(orderKeys.detail(91), {
    id: 91,
    status: "placed",
    canEdit: true,
    customerName: "Maria Silva",
    items: [],
  });
  queryClient.setQueryData(orderKeys.search("", 1).concat({
    search: "",
    period: "today",
    status: "placed",
    paymentStatus: "",
    slot: "",
    page: 1,
    timeZone: "Europe/Lisbon",
  }), {
    data: [
      {
        id: 91,
        status: "placed",
        canEdit: true,
        customerName: "Maria Silva",
        items: [],
      },
      {
        id: 14,
        status: "ready",
        canEdit: false,
        customerName: "Outro Cliente",
        items: [],
      },
    ],
    meta: { current_page: 1, last_page: 1, total: 2 },
  });

  synchronizeConfirmedOrderCaches(queryClient, updatedOrder);

  assert.deepEqual(
    (() => {
      const order = queryClient.getQueryData(orderKeys.detail(91)) as {
        id: number;
        status: string;
        canEdit?: boolean;
        customerName?: string | null;
      };

      return {
        id: order.id,
        status: order.status,
        canEdit: order.canEdit,
        customerName: order.customerName,
      };
    })(),
    {
      id: 91,
      status: "accepted",
      canEdit: false,
      customerName: "Maria Silva Alterada",
    },
  );
  assert.deepEqual(
    queryClient.getQueryData<{
      data: Array<{ id: number; status: string; canEdit?: boolean; customerName?: string | null; items: unknown[] }>;
      meta: { current_page: number; last_page: number; total: number };
    }>(orderKeys.search("", 1).concat({
      search: "",
      period: "today",
      status: "placed",
      paymentStatus: "",
      slot: "",
      page: 1,
      timeZone: "Europe/Lisbon",
    }))?.data.map((order) => ({
      id: order.id,
      status: order.status,
      canEdit: order.canEdit,
      customerName: order.customerName,
    })),
    [
      {
        id: 91,
        status: "accepted",
        canEdit: false,
        customerName: "Maria Silva Alterada",
      },
      {
        id: 14,
        status: "ready",
        canEdit: false,
        customerName: "Outro Cliente",
      },
    ],
  );
});

test("synchronizeConfirmedOrderCaches preserves previously loaded detail fields when the status response is partial", () => {
  const queryClient = new QueryClient();

  queryClient.setQueryData(orderKeys.detail(91), {
    id: 91,
    status: "placed",
    canEdit: true,
    paymentStatus: "paid",
    customerName: "Maria Silva",
    customerContact: "912345678",
    items: [
      {
        id: 1,
        productId: 12,
        productName: "Coxinha",
        quantity: 15,
      },
    ],
    notes: "Sem picante",
    store: {
      id: 3,
      name: "Loja Centro",
    },
  });

  synchronizeConfirmedOrderCaches(queryClient, {
    id: 91,
    status: "accepted",
    canEdit: false,
    items: [],
  });

  assert.deepEqual(
    (() => {
      const order = queryClient.getQueryData(orderKeys.detail(91)) as {
        id: number;
        status: string;
        canEdit?: boolean;
        paymentStatus?: string | null;
        customerName?: string | null;
        customerContact?: string | null;
        notes?: string | null;
      };

      return {
        id: order.id,
        status: order.status,
        canEdit: order.canEdit,
        paymentStatus: order.paymentStatus,
        customerName: order.customerName,
        customerContact: order.customerContact,
        notes: order.notes,
      };
    })(),
    {
      id: 91,
      status: "accepted",
      canEdit: false,
      paymentStatus: "paid",
      customerName: "Maria Silva",
      customerContact: "912345678",
      notes: "Sem picante",
    },
  );
  assert.deepEqual(
    (queryClient.getQueryData(orderKeys.detail(91)) as { items: unknown[]; store: unknown }).items,
    [
      {
        id: 1,
        productId: 12,
        productName: "Coxinha",
        quantity: 15,
      },
    ],
  );
  assert.deepEqual(
    (queryClient.getQueryData(orderKeys.detail(91)) as { store: unknown }).store,
    {
      id: 3,
      name: "Loja Centro",
    },
  );
});

test("synchronizeConfirmedOrderCaches does not remove filtered rows locally before background revalidation", () => {
  const queryClient = new QueryClient();
  const searchKey = orderKeys.search("", 1).concat({
    search: "",
    period: "today",
    status: "placed",
    paymentStatus: "",
    slot: "",
    page: 1,
    timeZone: "Europe/Lisbon",
  });

  queryClient.setQueryData(searchKey, {
    data: [
      {
        id: 91,
        status: "placed",
        canEdit: true,
        items: [],
      },
    ],
    meta: { current_page: 1, last_page: 1, total: 1 },
  });

  synchronizeConfirmedOrderCaches(queryClient, {
    id: 91,
    status: "accepted",
    canEdit: true,
    items: [],
  });

  assert.deepEqual(
    queryClient.getQueryData<{ data: Array<{ id: number; status: string; canEdit?: boolean }>; meta: unknown }>(searchKey)?.data.map((order) => ({
      id: order.id,
      status: order.status,
      canEdit: order.canEdit,
    })),
    [
      {
        id: 91,
        status: "accepted",
        canEdit: true,
      },
    ],
  );
});

test("performOrderStatusTransition updates the selected order with backend-confirmed status and editability", async () => {
  const selectedOrders: unknown[] = [];
  const toasts: Array<{ message: string; tone: "success" | "error" }> = [];
  let refetchCount = 0;

  await performOrderStatusTransition({
    currentOrder: {
      id: 91,
      status: "placed",
      canEdit: true,
      items: [],
    },
    isPending: false,
    nextStatus: "accepted",
    mutateStatus: async () => ({
      id: 91,
      status: "accepted",
      canEdit: false,
      items: [],
    }),
    setSelectedOrder: (order) => {
      selectedOrders.push(order);
    },
    toast: (message, tone) => {
      toasts.push({ message, tone });
    },
    refetchDetail: async () => {
      refetchCount += 1;
      return {};
    },
  });

  assert.deepEqual(selectedOrders, [
    {
      id: 91,
      status: "accepted",
      canEdit: false,
      items: [],
    },
  ]);
  assert.deepEqual(toasts, [
    {
      message: "Estado operacional atualizado com sucesso.",
      tone: "success",
    },
  ]);
  assert.equal(refetchCount, 0);
});

test("handleConfirmedOrderStatusUpdate does not wait for background invalidation to finish", async () => {
  const queryClient = new QueryClient();
  const invalidated: unknown[] = [];
  let resolveInvalidation: (() => void) | null = null;
  const invalidationStarted = new Promise<void>((resolve) => {
    resolveInvalidation = resolve;
  });

  queryClient.invalidateQueries = (async (filters) => {
    invalidated.push(filters.queryKey);
    await invalidationStarted;
    return Promise.resolve();
  }) as typeof queryClient.invalidateQueries;

  handleConfirmedOrderStatusUpdate(
    queryClient,
    {
      id: 91,
      status: "accepted",
      canEdit: false,
      items: [],
    },
    91,
  );

  await Promise.resolve();

  assert.deepEqual(queryClient.getQueryData(orderKeys.detail(91)), {
    id: 91,
    status: "accepted",
    canEdit: false,
    items: [],
  });
  assert.deepEqual(invalidated, [["orders", "list"]]);

  resolveInvalidation?.();
  await Promise.resolve();
});

test("performOrderStatusTransition keeps the sheet state and refetches on backend error", async () => {
  const selectedOrders: unknown[] = [];
  const toasts: Array<{ message: string; tone: "success" | "error" }> = [];
  let refetchCount = 0;

  await performOrderStatusTransition({
    currentOrder: {
      id: 91,
      status: "placed",
      canEdit: true,
      items: [],
    },
    isPending: false,
    nextStatus: "accepted",
    mutateStatus: async () => {
      throw new Error("Transição inválida.");
    },
    setSelectedOrder: (order) => {
      selectedOrders.push(order);
    },
    toast: (message, tone) => {
      toasts.push({ message, tone });
    },
    refetchDetail: async () => {
      refetchCount += 1;
      return {};
    },
  });

  assert.deepEqual(selectedOrders, []);
  assert.deepEqual(toasts, [
    {
      message: "Transição inválida.",
      tone: "error",
    },
  ]);
  assert.equal(refetchCount, 1);
});
