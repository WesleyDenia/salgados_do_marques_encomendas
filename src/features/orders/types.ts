export const ORDER_PAYMENT_STATUSES = ["pending", "partial", "paid"] as const;

export const ORDER_SLOT_OPTIONS = ["manha", "tarde", "noite"] as const;

export type OrderPaymentStatus = (typeof ORDER_PAYMENT_STATUSES)[number];

export type OrderSlot = (typeof ORDER_SLOT_OPTIONS)[number];

export type OrderProductOption = {
  id: number;
  name: string;
  description?: string | null;
  price?: number | null;
  active: boolean;
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
};

export type Order = {
  id: string | number;
  status: string;
  paymentStatus?: OrderPaymentStatus | null;
  slot?: OrderSlot | null;
  customerName?: string | null;
  customerContact?: string | null;
  items: OrderItem[];
  notes?: string | null;
  scheduledAt?: string | null;
  total?: number;
  store?: {
    id: number;
    name: string;
  } | null;
  user?: {
    id: number;
    name: string;
    email: string;
  } | null;
  createdAt?: string | null;
};
