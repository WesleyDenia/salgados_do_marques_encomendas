"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getCustomer, getCustomers, updateCustomer } from "@/features/customers/api";
import type { CustomerUpdatePayload } from "@/features/customers/types";

export const customerKeys = {
  all: ["customers"] as const,
  search: (search: string, page: number) =>
    [...customerKeys.all, "search", { search, page }] as const,
  detail: (customerId: number | string) =>
    [...customerKeys.all, "detail", String(customerId)] as const,
};

export function useCustomerSearch({
  search,
  page,
}: Readonly<{
  search: string;
  page: number;
}>) {
  return useQuery({
    queryKey: customerKeys.search(search, page),
    queryFn: () => getCustomers({ search, page }),
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
