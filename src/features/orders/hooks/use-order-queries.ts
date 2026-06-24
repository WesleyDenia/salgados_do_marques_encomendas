import { useQuery } from "@tanstack/react-query";

import {
  getOrder,
  getOrderProduct,
  getOrderSettings,
  getOrderProducts,
  getOrders,
  getOrderStores,
} from "@/features/orders/api";

type OrderSearchQueryKeyParams = {
  search: string;
  page: number;
  period?: string;
  status?: string;
  paymentStatus?: string;
  slot?: string;
  tagIds?: string;
  customStartDate?: string;
  customEndDate?: string;
  timeZone?: string;
};

export const orderKeys = {
  all: ["orders"] as const,
  list: () => [...orderKeys.all, "list"] as const,
  search: (params: OrderSearchQueryKeyParams) =>
    [...orderKeys.all, "search", params] as const,
  detail: (orderId: number | string) =>
    [...orderKeys.all, "detail", String(orderId)] as const,
  productDetail: (productId: number | string) =>
    [...orderKeys.all, "product-detail", String(productId)] as const,
  settings: () => [...orderKeys.all, "settings"] as const,
  products: () => [...orderKeys.all, "products"] as const,
  stores: () => [...orderKeys.all, "stores"] as const,
};

export function useOrders() {
  return useQuery({
    queryKey: orderKeys.list(),
    queryFn: () => getOrders(),
  });
}

export function useOrderDetail(orderId?: number | string | null) {
  return useQuery({
    queryKey: orderKeys.detail(orderId ?? "none"),
    queryFn: () => getOrder(orderId as number | string),
    enabled: !!orderId,
    staleTime: 0,
  });
}

export function useOrderSettings() {
  return useQuery({
    queryKey: orderKeys.settings(),
    queryFn: getOrderSettings,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrderProducts() {
  return useQuery({
    queryKey: orderKeys.products(),
    queryFn: getOrderProducts,
  });
}

export function useOrderProductDetail(productId?: number | string | null) {
  return useQuery({
    queryKey: orderKeys.productDetail(productId ?? "none"),
    queryFn: () => getOrderProduct(productId as number | string),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrderStores() {
  return useQuery({
    queryKey: orderKeys.stores(),
    queryFn: getOrderStores,
  });
}
