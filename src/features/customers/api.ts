import { apiClient } from "@/lib/api/http";
import type { ApiMeta } from "@/types/api";
import {
  normalizeOrderResource,
  type BackendOrder,
} from "@/features/orders/api";

import type {
  Customer,
  CustomerDetail,
  CustomerUpdatePayload,
} from "@/features/customers/types";

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

type BackendCustomerDetail = BackendCustomer & {
  email?: string | null;
  nif?: string | null;
  birth_date?: string | null;
  created_at?: string | null;
  orders?: BackendOrder[];
};

type CustomerResourceResponse = {
  data: BackendCustomerDetail;
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

function normalizeCustomerDetail(customer: BackendCustomerDetail): CustomerDetail {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email ?? "",
    phone: customer.phone ?? null,
    nif: customer.nif ?? null,
    birthDate: customer.birth_date ?? null,
    createdAt: customer.created_at ?? null,
    ordersCount: customer.orders_count ?? 0,
    orders: (customer.orders ?? []).map(normalizeOrderResource),
  };
}

export async function getCustomer(customerId: number | string): Promise<CustomerDetail> {
  const response = await apiClient.get<CustomerResourceResponse>(
    `/admin/customers/${encodeURIComponent(customerId)}`,
  );

  return normalizeCustomerDetail(response.data.data);
}

export async function updateCustomer(
  customerId: number | string,
  payload: CustomerUpdatePayload,
): Promise<CustomerDetail> {
  const response = await apiClient.put<CustomerResourceResponse>(
    `/admin/customers/${encodeURIComponent(customerId)}`,
    {
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      nif: payload.nif,
      birth_date: payload.birthDate,
    },
  );

  return normalizeCustomerDetail(response.data.data);
}
