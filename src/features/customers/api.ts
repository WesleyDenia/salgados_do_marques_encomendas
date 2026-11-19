import { apiClient } from "@/lib/api/http";
import type { ApiMeta } from "@/types/api";

import type { Customer } from "@/features/customers/types";

type BackendCustomer = {
  id: number;
  name: string;
  phone?: string | null;
  orders_count?: number;
};

type CustomerCollectionResponse = {
  data: BackendCustomer[];
  meta?: ApiMeta;
};

export type CustomersResponse = {
  data: Customer[];
  meta?: ApiMeta;
};

export async function getCustomers({
  search,
  page,
}: Readonly<{
  search?: string;
  page?: number;
}> = {}): Promise<CustomersResponse> {
  const params: Record<string, string | number> = {};

  if (search?.trim()) {
    params.search = search.trim();
  }

  if (page && page > 1) {
    params.page = page;
  }

  const response = await apiClient.get<CustomerCollectionResponse>("/admin/customers", {
    params,
  });

  return {
    data: (response.data.data ?? []).map((customer) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone ?? null,
      ordersCount: customer.orders_count ?? 0,
    })),
    meta: response.data.meta,
  };
}
