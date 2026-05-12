import { apiClient } from "@/lib/api/http";
import type { ApiMeta } from "@/types/api";
import {
  normalizeOrderCreateInput,
  type OrderCreateInput,
} from "@/features/orders/schemas/order-schemas";
import type {
  Order,
  OrderPaymentStatus,
  OrderProductOption,
  OrderSlot,
  OrderStoreOption,
} from "@/features/orders/types";

type ResourceResponse<T> = {
  data: T;
};

type ResourceCollectionResponse<T> = {
  data: T[];
  meta?: ApiMeta;
};

type BackendOrderItem = {
  id: number;
  product_id: number;
  name: string;
  quantity: number;
  total: number;
};

type BackendOrder = {
  id: number;
  status: string;
  payment_status?: OrderPaymentStatus | null;
  slot?: OrderSlot | null;
  customer_name?: string | null;
  customer_contact?: string | null;
  scheduled_at?: string | null;
  total?: number;
  notes?: string | null;
  items?: BackendOrderItem[];
  store?: {
    id: number;
    name: string;
  } | null;
  user?: {
    id: number;
    name: string;
    email: string;
  } | null;
  created_at?: string | null;
};

type BackendProduct = {
  id: number;
  name: string;
  description?: string | null;
  price?: number | null;
  active: boolean;
};

type BackendStore = {
  id: number;
  name: string;
  city?: string | null;
  address?: string | null;
  accepts_orders: boolean;
  default_store: boolean;
};

export type OrdersResponse = {
  data: Order[];
  meta?: ApiMeta;
};

function normalizeOrderResource(resource: BackendOrder): Order {
  return {
    id: resource.id,
    status: resource.status,
    paymentStatus: resource.payment_status ?? null,
    slot: resource.slot ?? null,
    customerName: resource.customer_name ?? null,
    customerContact: resource.customer_contact ?? null,
    items: (resource.items ?? []).map((item) => ({
      id: item.id,
      productId: item.product_id,
      productName: item.name,
      quantity: item.quantity,
      total: item.total,
    })),
    notes: resource.notes ?? null,
    scheduledAt: resource.scheduled_at ?? null,
    total: resource.total,
    store: resource.store ?? null,
    user: resource.user ?? null,
    createdAt: resource.created_at ?? null,
  };
}

function normalizeProductResource(resource: BackendProduct): OrderProductOption {
  return {
    id: resource.id,
    name: resource.name,
    description: resource.description ?? null,
    price: resource.price ?? null,
    active: resource.active,
  };
}

function normalizeStoreResource(resource: BackendStore): OrderStoreOption {
  return {
    id: resource.id,
    name: resource.name,
    city: resource.city ?? null,
    address: resource.address ?? null,
    acceptsOrders: resource.accepts_orders,
    defaultStore: resource.default_store,
  };
}

function buildScheduledAt(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function buildOperationalNotes(input: ReturnType<typeof normalizeOrderCreateInput>) {
  const notes = input.observations.trim();

  return notes.length > 0 ? notes : null;
}

export async function getOrders(): Promise<OrdersResponse> {
  const response = await apiClient.get<ResourceCollectionResponse<BackendOrder>>("/admin/orders");

  return {
    data: response.data.data.map(normalizeOrderResource),
    meta: response.data.meta,
  };
}

export async function getOrderProducts() {
  const response = await apiClient.get<ResourceCollectionResponse<BackendProduct>>(
    "/products",
  );

  return {
    data: response.data.data.map(normalizeProductResource),
    meta: response.data.meta,
  };
}

export async function getOrderStores() {
  const response = await apiClient.get<ResourceCollectionResponse<BackendStore>>(
    "/stores",
    {
      params: {
        accepts_orders: true,
      },
    },
  );

  return {
    data: response.data.data.map(normalizeStoreResource),
    meta: response.data.meta,
  };
}

export async function createOrder(input: OrderCreateInput) {
  const payload = normalizeOrderCreateInput(input);
  const response = await apiClient.post<ResourceResponse<BackendOrder>>("/orders", {
    store_id: payload.storeId,
    customer_name: payload.customerName,
    customer_contact: payload.customerContact,
    payment_status: payload.paymentStatus,
    slot: payload.slot,
    scheduled_at: buildScheduledAt(payload.date, payload.time),
    notes: buildOperationalNotes(payload),
    items: payload.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
    })),
  });

  return normalizeOrderResource(response.data.data);
}
