import { apiClient } from "@/lib/api/http";
import type { ApiMeta, ApiResponse } from "@/types/api";
import {
  normalizeOrderCreateInput,
  type OrderCreateInput,
  type NormalizedOrderCreateInput,
} from "@/features/orders/schemas/order-schemas";
import type {
  OrderFlavorOption,
  Order,
  OrderHistoryEntry,
  OrderPartialWithdrawal,
  OrderPaymentStatus,
  OrderProductOption,
  OrderProductVariantOption,
  OrderStoreOption,
  OrderTag,
} from "@/features/orders/types";
import { zonedDateTimeToUtcDate } from "@/features/orders/utils/operational-timezone";

type ResourceResponse<T> = {
  data: T;
};

type ResourceCollectionResponse<T> = {
  data: T[];
  meta?: ApiMeta;
};

function readCollectionPayload<T>(payload: unknown): { data: T[]; meta?: ApiMeta } {
  if (Array.isArray(payload)) {
    return { data: payload };
  }

  if (payload && typeof payload === "object") {
    const collection = Reflect.get(payload, "data");
    const meta = Reflect.get(payload, "meta");

    if (Array.isArray(collection)) {
      return {
        data: collection as T[],
        meta: (meta as ApiMeta | undefined) ?? undefined,
      };
    }
  }

  return { data: [] };
}

function readResourcePayload<T>(payload: unknown): T | null {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const resource = Reflect.get(payload, "data");

    if (resource && typeof resource === "object" && !Array.isArray(resource)) {
      return resource as T;
    }

    return payload as T;
  }

  return null;
}

function normalizeOperationalApiDateTime(value?: string | null) {
  if (!value) {
    return value ?? null;
  }

  const match = value.match(
    /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/,
  );

  if (!match) {
    return value;
  }

  return `${match[1]}T${match[2]}.000Z`;
}

type BackendOrderItem = {
  id: number;
  parent_order_item_id?: number | null;
  product_id: number;
  variant_id?: number | null;
  variant_name?: string | null;
  variant_unit_count?: number | null;
  name: string;
  quantity: number;
  total: number;
  original_units?: number;
  withdrawn_units?: number;
  remaining_units?: number;
  can_withdraw_partially?: boolean;
  options?: {
    flavors?: number[];
    flavor_names?: string[];
  } | null;
};

type BackendOrder = {
  id: number;
  parent_order_id?: number | null;
  status: string;
  can_edit?: boolean;
  payment_status?: OrderPaymentStatus | null;
  slot?: string | null;
  customer_name?: string | null;
  customer_contact?: string | null;
  scheduled_at?: string | null;
  total?: number;
  notes?: string | null;
  tags?: BackendOrderTag[];
  partial_withdrawals?: BackendOrderPartialWithdrawal[];
  items?: BackendOrderItem[];
  parent_order?: {
    id: number;
    status: string;
  } | null;
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
  history?: BackendOrderHistory[];
  created_at?: string | null;
  cancelled_at?: string | null;
};

type BackendOrderTag = {
  id: number;
  name: string;
  color?: string | null;
  active?: boolean;
};

type BackendOrderHistory = {
  id: number;
  user_id?: number | null;
  user?: {
    id: number;
    name: string;
    email: string;
  } | null;
  action: string;
  changes?: Record<string, unknown> | null;
  created_at?: string | null;
};

type BackendOrderPartialWithdrawal = {
  id: number;
  parent_order_item_id?: number | null;
  generated_order_id?: number | null;
  requested_units: number;
  flavor_ids?: number[];
  flavor_names?: string[];
  scheduled_at?: string | null;
  status: string;
  notes?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
};

type BackendProduct = {
  id: number;
  name: string;
  description?: string | null;
  price?: number | null;
  active: boolean;
  category?: {
    id?: number | null;
    name?: string | null;
    order?: number | null;
  } | null;
  allowed_flavors?: Array<{
    id: number;
    name: string;
  }>;
  variants?: Array<{
    id: number;
    name: string;
    unit_count: number;
    max_flavors: number;
    price: number;
    active: boolean;
    display_order: number;
  }>;
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
  tagIds?: number[];
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
  slotLabels: Record<string, string>;
  activeTags: OrderTag[];
  availableTags: OrderTag[];
};

function normalizeOrderTagResource(resource: BackendOrderTag): OrderTag {
  return {
    id: resource.id,
    name: resource.name,
    color: resource.color ?? "#92400E",
    active: resource.active ?? true,
  };
}

function normalizeOrderStoresResponse(payload: unknown) {
  const collection = readCollectionPayload<BackendStore>(payload);

  return {
    data: collection.data.map(normalizeStoreResource),
    meta: collection.meta,
  };
}

function normalizeOrderHistoryEntry(
  resource: BackendOrderHistory,
): OrderHistoryEntry {
  return {
    id: resource.id,
    userId: resource.user_id ?? null,
    user: resource.user ?? null,
    action: resource.action,
    changes: resource.changes ?? null,
    createdAt: normalizeOperationalApiDateTime(resource.created_at ?? null),
  };
}

function normalizePartialWithdrawalResource(
  resource: BackendOrderPartialWithdrawal,
): OrderPartialWithdrawal {
  return {
    id: resource.id,
    parentOrderItemId: resource.parent_order_item_id ?? null,
    generatedOrderId: resource.generated_order_id ?? null,
    requestedUnits: resource.requested_units,
    flavorIds: resource.flavor_ids ?? [],
    flavorNames: resource.flavor_names ?? [],
    scheduledAt: normalizeOperationalApiDateTime(resource.scheduled_at ?? null),
    status: resource.status,
    notes: resource.notes ?? null,
    completedAt: normalizeOperationalApiDateTime(resource.completed_at ?? null),
    cancelledAt: normalizeOperationalApiDateTime(resource.cancelled_at ?? null),
  };
}

export function normalizeOrderResource(resource: BackendOrder): Order {
  return {
    id: resource.id,
    parentOrderId: resource.parent_order_id ?? null,
    status: resource.status,
    canEdit: resource.can_edit,
    paymentStatus: resource.payment_status ?? null,
    slot: resource.slot ?? null,
    customerName: resource.customer_name ?? null,
    customerContact: resource.customer_contact ?? null,
    tags: Array.isArray(resource.tags)
      ? resource.tags.map(normalizeOrderTagResource)
      : [],
    items: (resource.items ?? []).map((item) => ({
      id: item.id,
      parentOrderItemId: item.parent_order_item_id ?? null,
      productId: item.product_id,
      productName: item.name,
      quantity: item.quantity,
      total: item.total,
      variantId: item.variant_id ?? null,
      variantName: item.variant_name ?? null,
      variantUnitCount: item.variant_unit_count ?? null,
      originalUnits: item.original_units ?? null,
      withdrawnUnits: item.withdrawn_units ?? 0,
      remainingUnits: item.remaining_units ?? null,
      canWithdrawPartially: item.can_withdraw_partially ?? false,
      flavorIds: item.options?.flavors ?? [],
      flavorNames: item.options?.flavor_names ?? [],
    })),
    notes: resource.notes ?? null,
    scheduledAt: normalizeOperationalApiDateTime(resource.scheduled_at ?? null),
    cancelledAt: normalizeOperationalApiDateTime(resource.cancelled_at ?? null),
    total: resource.total,
    store: resource.store ?? null,
    parentOrder: resource.parent_order ?? null,
    user: resource.user ?? null,
    history: Array.isArray(resource.history)
      ? resource.history.map(normalizeOrderHistoryEntry)
      : [],
    partialWithdrawals: Array.isArray(resource.partial_withdrawals)
      ? resource.partial_withdrawals.map(normalizePartialWithdrawalResource)
      : [],
    createdAt: normalizeOperationalApiDateTime(resource.created_at ?? null),
  };
}

function normalizeProductResource(resource: BackendProduct): OrderProductOption {
  const allowedFlavors: OrderFlavorOption[] = Array.isArray(resource.allowed_flavors)
    ? resource.allowed_flavors.map((flavor) => ({
        id: flavor.id,
        name: flavor.name,
      }))
    : [];
  const variants: OrderProductVariantOption[] = Array.isArray(resource.variants)
    ? resource.variants.map((variant) => ({
        id: variant.id,
        name: variant.name,
        unitCount: variant.unit_count,
        maxFlavors: variant.max_flavors,
        price: variant.price,
        active: variant.active,
        displayOrder: variant.display_order,
      }))
    : [];

  return {
    id: resource.id,
    name: resource.name,
    description: resource.description ?? null,
    price: resource.price ?? null,
    active: resource.active,
    category: resource.category
      ? {
          id: resource.category.id ?? null,
          name: resource.category.name ?? null,
          order: resource.category.order ?? null,
        }
      : null,
    allowedFlavors,
    variants,
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
  if (Array.isArray(filters.tagIds) && filters.tagIds.length > 0) {
    params.tag_ids = filters.tagIds.join(",");
  }
  if (filters.scheduledFrom?.trim())
    params.scheduled_from = filters.scheduledFrom.trim();
  if (filters.scheduledTo?.trim()) params.scheduled_to = filters.scheduledTo.trim();
  if (filters.timezone?.trim()) params.timezone = filters.timezone.trim();

  const response = await apiClient.get<ResourceCollectionResponse<BackendOrder>>(
    "/admin/orders",
    { params },
  );
  const payload = readCollectionPayload<BackendOrder>(response.data);

  return {
    data: payload.data.map(normalizeOrderResource),
    meta: payload.meta,
  };
}

export async function getOrder(orderId: number | string): Promise<Order> {
  const response = await apiClient.get<ResourceResponse<BackendOrder>>(
    `/admin/orders/${encodeURIComponent(orderId)}`,
  );
  const payload = readResourcePayload<BackendOrder>(response.data);

  if (!payload) {
    throw new Error("Resposta inválida ao carregar a encomenda.");
  }

  return normalizeOrderResource(payload);
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
      slot_labels?: Record<string, string>;
      active_tags?: BackendOrderTag[];
      available_tags?: BackendOrderTag[];
    }>
  >("/orders/settings");
  const payload = readResourcePayload<{
    start_time: string;
    end_time: string;
    minimum_minutes: number;
    cancel_minutes: number;
    timezone: string;
    scheduling_window_days: number;
    status_labels?: Record<string, string>;
    slot_labels?: Record<string, string>;
    active_tags?: BackendOrderTag[];
    available_tags?: BackendOrderTag[];
  }>(response.data);

  if (!payload) {
    throw new Error("Resposta inválida ao carregar as definições operacionais.");
  }

  return {
    startTime: payload.start_time,
    endTime: payload.end_time,
    minimumMinutes: payload.minimum_minutes,
    cancelMinutes: payload.cancel_minutes,
    timezone: payload.timezone,
    schedulingWindowDays: payload.scheduling_window_days,
    statusLabels: payload.status_labels ?? {},
    slotLabels: payload.slot_labels ?? {},
    activeTags: Array.isArray(payload.active_tags)
      ? payload.active_tags.map(normalizeOrderTagResource)
      : [],
    availableTags: Array.isArray(payload.available_tags)
      ? payload.available_tags.map(normalizeOrderTagResource)
      : [],
  };
}

export async function getOrderProducts() {
  const response = await apiClient.get<ResourceCollectionResponse<BackendProduct>>(
    "/products",
  );
  const payload = readCollectionPayload<BackendProduct>(response.data);

  return {
    data: payload.data.map(normalizeProductResource),
    meta: payload.meta,
  };
}

export async function getOrderProduct(productId: number | string) {
  const response = await apiClient.get<ResourceResponse<BackendProduct>>(
    `/products/${encodeURIComponent(productId)}`,
  );
  const payload = readResourcePayload<BackendProduct>(response.data);

  if (!payload) {
    throw new Error("Resposta inválida ao carregar o artigo.");
  }

  return normalizeProductResource(payload);
}

export async function getOrderStores() {
  const filteredResponse = await apiClient.get<ResourceCollectionResponse<BackendStore>>(
    "/stores",
    {
      params: {
        accepts_orders: 1,
      },
    },
  );
  const filteredStores = normalizeOrderStoresResponse(filteredResponse.data);

  if (filteredStores.data.length > 0) {
    return filteredStores;
  }

  const fallbackResponse = await apiClient.get<ResourceCollectionResponse<BackendStore>>(
    "/stores",
  );
  const payload = readCollectionPayload<BackendStore>(fallbackResponse.data);

  return {
    data: payload.data.map(normalizeStoreResource),
    meta: payload.meta,
  };
}

export async function createOrder(input: OrderCreateInput, timeZone?: string) {
  const payload = normalizeOrderCreateInput(input);
  const response = await apiClient.post<ResourceResponse<BackendOrder>>(
    "/orders",
    buildOrderWritePayload(payload, timeZone),
  );
  const resource = readResourcePayload<BackendOrder>(response.data);

  if (!resource) {
    throw new Error("Resposta inválida ao criar a encomenda.");
  }

  return normalizeOrderResource(resource);
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
  const resource = readResourcePayload<BackendOrder>(response.data);

  if (!resource) {
    throw new Error("Resposta inválida ao atualizar a encomenda.");
  }

  return normalizeOrderResource(resource);
}

export async function createOrderPartialWithdrawal(
  orderId: number | string,
  input: {
    parentOrderItemId: number;
    requestedUnits: number;
    flavorIds?: number[];
    date: string;
    time: string;
    allowScheduleException?: boolean;
    allowPreparationCapacityOverflow?: boolean;
    generateChildOrder?: boolean;
    notes?: string;
  },
  timeZone?: string,
) {
  const response = await apiClient.post<
    ResourceResponse<{
      withdrawal: BackendOrderPartialWithdrawal;
      parent_order: BackendOrder;
      generated_order?: BackendOrder | null;
    }>
  >(
    `/admin/orders/${encodeURIComponent(orderId)}/partial-withdrawals`,
    {
      parent_order_item_id: input.parentOrderItemId,
      requested_units: input.requestedUnits,
      flavor_ids: input.flavorIds ?? [],
      scheduled_at: buildScheduledAt(input.date, input.time, timeZone),
      allow_schedule_exception: input.allowScheduleException ?? false,
      ...(input.allowPreparationCapacityOverflow
        ? { allow_preparation_capacity_overflow: true }
        : {}),
      generate_child_order: input.generateChildOrder ?? true,
      notes: input.notes?.trim() ? input.notes.trim() : null,
    },
  );
  const payload = readResourcePayload<{
    withdrawal: BackendOrderPartialWithdrawal;
    parent_order: BackendOrder;
    generated_order?: BackendOrder | null;
  }>(response.data);

  if (!payload) {
    throw new Error("Resposta inválida ao registar a retirada parcial.");
  }

  return {
    withdrawal: normalizePartialWithdrawalResource(payload.withdrawal),
    parentOrder: normalizeOrderResource(payload.parent_order),
    generatedOrder: payload.generated_order
      ? normalizeOrderResource(payload.generated_order)
      : null,
  };
}

export async function updateOrderStatus(
  orderId: number | string,
  status: string,
) {
  const response = await apiClient.patch<ResourceResponse<BackendOrder>>(
    `/admin/orders/${encodeURIComponent(orderId)}/status`,
    { status },
  );
  const resource = readResourcePayload<BackendOrder>(response.data);

  if (!resource) {
    throw new Error("Resposta inválida ao atualizar o estado da encomenda.");
  }

  return normalizeOrderResource(resource);
}


function buildOrderWritePayload(
  payload: NormalizedOrderCreateInput,
  timeZone?: string,
) {
  return {
    store_id: payload.storeId,
    customer_name: payload.customerName,
    customer_contact: payload.customerContact,
    tag_ids: payload.tagIds ?? [],
    allow_schedule_exception: payload.allowScheduleException,
    ...(payload.allowPreparationCapacityOverflow
      ? { allow_preparation_capacity_overflow: true }
      : {}),
    payment_status: payload.paymentStatus,
    scheduled_at: buildScheduledAt(payload.date, payload.time, timeZone),
    notes: buildOperationalNotes(payload),
    items: payload.items.map((item) => ({
      ...(item.parentOrderItemId != null
        ? { parent_order_item_id: item.parentOrderItemId }
        : {}),
      product_id: item.productId,
      quantity: item.quantity,
      ...(item.variantId != null ? { variant_id: item.variantId } : {}),
      flavors: item.flavorIds ?? [],
    })),
  };
}
