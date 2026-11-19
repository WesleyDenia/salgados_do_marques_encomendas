"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getCustomers } from "@/features/customers/api";

export function useCustomerSearch({
  search,
  page,
}: Readonly<{
  search: string;
  page: number;
}>) {
  return useQuery({
    queryKey: ["customers", "search", { search, page }],
    queryFn: () => getCustomers({ search, page }),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
}
