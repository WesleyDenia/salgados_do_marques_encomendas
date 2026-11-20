"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getCustomer,
  getCustomers,
  updateCustomer,
  type CustomerSortDirection,
  type CustomerSortField,
} from "@/features/customers/api";
import type { CustomerUpdatePayload } from "@/features/customers/types";

export const customerKeys = {
  all: ["customers"] as const,
  search: (
    search: string,
    page: number,
    sort?: CustomerSortField,
    direction?: CustomerSortDirection,
  ) => [...customerKeys.all, "search", { search, page, sort, direction }] as const,
  detail: (customerId: number | string) =>
    [...customerKeys.all, "detail", String(customerId)] as const,
};

export function useCustomerSearch({
  search,
  page,
  sort,
  direction,
}: Readonly<{
  search: string;
  page: number;
  sort?: CustomerSortField;
  direction?: CustomerSortDirection;
}>) {
  return useQuery({
    queryKey: customerKeys.search(search, page, sort, direction),
    queryFn: () => getCustomers({ search, page, sort, direction }),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
}

export function useCustomerDetail(customerId: number | string) {
  return useQuery({
    queryKey: customerKeys.detail(customerId),
    queryFn: () => getCustomer(customerId),
    staleTime: 0,
  });
}

export function useUpdateCustomer(customerId: number | string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CustomerUpdatePayload) => updateCustomer(customerId, payload),
    onSuccess: (customer) => {
      queryClient.setQueryData(customerKeys.detail(customerId), customer);
      void queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}
