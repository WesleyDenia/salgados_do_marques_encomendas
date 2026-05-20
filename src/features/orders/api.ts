import { apiClient } from "@/lib/api/http";
import type { ApiMeta, ApiResponse } from "@/types/api";
import {
  normalizeOrderCreateInput,
  type OrderCreateInput,
  type NormalizedOrderCreateInput,
} from "@/features/orders/schemas/order-schemas";
import type {
  Order,
  OrderPaymentStatus,
  OrderProductOption,
  OrderSlot,
  OrderStoreOption,
} from "@/features/orders/types";
import { zonedDateTimeToUtcDate } from "@/features/orders/utils/operational-timezone";

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
  variant_id?: number | null;
  variant_name?: string | null;
  name: string;
  quantity: number;
  total: number;
  options?: {
    flavors?: number[];
    flavor_names?: string[];
  } | null;
};

type BackendOrder = {
  id: number;
  status: string;
  can_edit?: boolean;
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
    city?: string | null;
    address?: string | null;
    phone?: string | null;
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

export type OrderSearchFilters = {
  search?: string;
  page?: number;
  status?: string;
  paymentStatus?: string;
  slot?: string;
  scheduledFrom?: string;
  scheduledTo?: string;
  timezone?: string;
};

export type OrderSettings = {
  startTime: string;
  endTime: string;
  minimumMinutes: number;
  cancelMinutes: number;
  timezone: string;
  schedulingWindowDays: number;
  statusLabels: Record<string, string>;
};

function normalizeOrderResource(resource: BackendOrder): Order {
  return {
    id: resource.id,
    status: resource.status,
    canEdit: resource.can_edit,
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
      variantId: item.variant_id ?? null,
      variantName: item.variant_name ?? null,
      flavorIds: item.options?.flavors ?? [],
      flavorNames: item.options?.flavor_names ?? [],
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

function buildScheduledAt(date: string, time: string, timeZone = "Europe/Lisbon") {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  return zonedDateTimeToUtcDate(
    {
      year,
      month,
      day,
      hour,
      minute,
      second: 0,
    },
    timeZone,
  ).toISOString();
}

function buildOperationalNotes(input: ReturnType<typeof normalizeOrderCreateInput>) {
  const notes = input.observations.trim();

  return notes.length > 0 ? notes : null;
}

export async function getOrders(
  filters: OrderSearchFilters = {},
): Promise<OrdersResponse> {
  const params: Record<string, unknown> = {};

  if (filters.search?.trim()) params.search = filters.search.trim();
  if (filters.page && filters.page > 1) params.page = filters.page;
  if (filters.status?.trim()) params.status = filters.status.trim();
  if (filters.paymentStatus?.trim())
    params.payment_status = filters.paymentStatus.trim();
  if (filters.slot?.trim()) params.slot = filters.slot.trim();
  if (filters.scheduledFrom?.trim())
    params.scheduled_from = filters.scheduledFrom.trim();
  if (filters.scheduledTo?.trim()) params.scheduled_to = filters.scheduledTo.trim();
  if (filters.timezone?.trim()) params.timezone = filters.timezone.trim();

  const response = await apiClient.get<ResourceCollectionResponse<BackendOrder>>(
    "/admin/orders",
    { params },
  );

  return {
    data: response.data.data.map(normalizeOrderResource),
    meta: response.data.meta,
  };
}

export async function getOrder(orderId: number | string): Promise<Order> {
  const response = await apiClient.get<ResourceResponse<BackendOrder>>(
    `/admin/orders/${encodeURIComponent(orderId)}`,
  );

  return normalizeOrderResource(response.data.data);
}

export async function getOrderSettings(): Promise<OrderSettings> {
  const response = await apiClient.get<
    ApiResponse<{
      start_time: string;
      end_time: string;
      minimum_minutes: number;
      cancel_minutes: number;
      timezone: string;
      scheduling_window_days: number;
      status_labels?: Record<string, string>;
    }>
  >("/orders/settings");

  return {
    startTime: response.data.data.start_time,
    endTime: response.data.data.end_time,
    minimumMinutes: response.data.data.minimum_minutes,
    cancelMinutes: response.data.data.cancel_minutes,
    timezone: response.data.data.timezone,
    schedulingWindowDays: response.data.data.scheduling_window_days,
    statusLabels: response.data.data.status_labels ?? {},
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

export async function createOrder(input: OrderCreateInput, timeZone?: string) {
  const payload = normalizeOrderCreateInput(input);
  const response = await apiClient.post<ResourceResponse<BackendOrder>>(
    "/orders",
    buildOrderWritePayload(payload, timeZone),
  );

  return normalizeOrderResource(response.data.data);
}

export async function updateOrder(
  orderId: number | string,
  input: OrderCreateInput,
  timeZone?: string,
) {
  const payload = normalizeOrderCreateInput(input);
  const response = await apiClient.patch<ResourceResponse<BackendOrder>>(
    `/admin/orders/${encodeURIComponent(orderId)}`,
    buildOrderWritePayload(payload, timeZone),
  );

  return normalizeOrderResource(response.data.data);
}

export async function updateOrderStatus(
  orderId: number | string,
  status: string,
) {
  const response = await apiClient.patch<ResourceResponse<BackendOrder>>(
    `/admin/orders/${encodeURIComponent(orderId)}/status`,
    { status },
  );

  return normalizeOrderResource(response.data.data);
}

export { normalizeOrderResource };

function buildOrderWritePayload(
  payload: NormalizedOrderCreateInput,
  timeZone?: string,
) {
  return {
    store_id: payload.storeId,
    customer_name: payload.customerName,
    customer_contact: payload.customerContact,
    payment_status: payload.paymentStatus,
    slot: payload.slot,
    scheduled_at: buildScheduledAt(payload.date, payload.time, timeZone),
    notes: buildOperationalNotes(payload),
    items: payload.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      ...(item.variantId != null ? { variant_id: item.variantId } : {}),
      flavors: item.flavorIds ?? [],
    })),
  };
}
