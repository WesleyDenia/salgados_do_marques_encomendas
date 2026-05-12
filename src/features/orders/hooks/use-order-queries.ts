import { useQuery } from "@tanstack/react-query";

import {
  getOrderProducts,
  getOrders,
  getOrderStores,
} from "@/features/orders/api";

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: getOrders,
  });
}

export function useOrderProducts() {
  return useQuery({
    queryKey: ["orders", "products"],
    queryFn: getOrderProducts,
  });
}

export function useOrderStores() {
  return useQuery({
    queryKey: ["orders", "stores"],
    queryFn: getOrderStores,
  });
}
