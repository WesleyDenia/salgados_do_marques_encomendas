export const ORDER_PAYMENT_STATUSES = ["pending", "partial", "paid"] as const;

export const ORDER_SLOT_OPTIONS = ["manha", "tarde", "noite"] as const;

export type OrderPaymentStatus = (typeof ORDER_PAYMENT_STATUSES)[number];

export type OrderSlot = (typeof ORDER_SLOT_OPTIONS)[number];

export type OrderFlavorOption = {
  id: number;
  name: string;
};

export type OrderProductVariantOption = {
  id: number;
  name: string;
  unitCount: number;
  maxFlavors: number;
  price: number;
  active: boolean;
  displayOrder: number;
};

export const ORDER_PAYMENT_STATUS_LABELS: Record<OrderPaymentStatus, string> = {
  pending: "Pendente",
  partial: "Parcial",
  paid: "Pago",
};

export const ORDER_SLOT_LABELS: Record<OrderSlot, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
};

export type OrderProductOption = {
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
  allowedFlavors?: OrderFlavorOption[];
  variants?: OrderProductVariantOption[];
};

export type OrderStoreOption = {
  id: number;
  name: string;
  city?: string | null;
  address?: string | null;
  acceptsOrders: boolean;
  defaultStore: boolean;
};

export type OrderItem = {
  id?: string | number;
  productId: number;
  productName: string;
  quantity: number;
  total?: number;
  variantId?: number | null;
  variantName?: string | null;
  flavorIds?: number[];
  flavorNames?: string[];
};

export type OrderHistoryEntry = {
  id: string | number;
  userId?: number | null;
  user?: {
    id: number;
    name: string;
    email: string;
  } | null;
  action: string;
  changes?: Record<string, unknown> | null;
  createdAt?: string | null;
};

export type Order = {
  id: string | number;
  status: string;
  canEdit?: boolean;
  paymentStatus?: OrderPaymentStatus | null;
  slot?: OrderSlot | null;
  customerName?: string | null;
  customerContact?: string | null;
  items: OrderItem[];
  notes?: string | null;
  scheduledAt?: string | null;
  cancelledAt?: string | null;
  total?: number;
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
  history?: OrderHistoryEntry[];
  createdAt?: string | null;
};
