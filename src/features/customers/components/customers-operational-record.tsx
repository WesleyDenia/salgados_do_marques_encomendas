"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderSearch } from "@/features/orders/components/order-search";
import {
  CUSTOMER_SORT_FIELDS,
  type CustomerSortDirection,
  type CustomerSortField,
} from "@/features/customers/api";
import { useCustomerSearch } from "@/features/customers/hooks/use-customer-search";

function getPage(value: string | null) {
  const page = Number(value ?? "1");

  return Number.isInteger(page) && page > 0 ? page : 1;
}

function getSortField(value: string | null): CustomerSortField | undefined {
  return CUSTOMER_SORT_FIELDS.find((field) => field === value);
}

function getSortDirection(value: string | null): CustomerSortDirection | undefined {
  return value === "asc" || value === "desc" ? value : undefined;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function SortableTableHead({
  label,
  field,
  activeField,
  direction,
  align = "left",
  onSort,
}: Readonly<{
  label: string;
  field: CustomerSortField;
  activeField?: CustomerSortField;
  direction?: CustomerSortDirection;
  align?: "left" | "right";
  onSort: (field: CustomerSortField) => void;
}>) {
  const isActive = activeField === field;
  const Icon = !isActive ? ChevronsUpDown : direction === "desc" ? ArrowDown : ArrowUp;

  return (
    <TableHead
      className={align === "right" ? "text-right" : undefined}
      aria-sort={isActive ? (direction === "desc" ? "descending" : "ascending") : "none"}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={align === "right" ? "-mr-2 w-full justify-end" : "-ml-2"}
        onClick={() => onSort(field)}
      >
        {label}
        <Icon className="size-3.5" aria-hidden="true" />
      </Button>
    </TableHead>
  );
}

export function CustomersOperationalRecord() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search") ?? "";
  const page = getPage(searchParams.get("page"));
  const sort = getSortField(searchParams.get("sort"));
  const direction = getSortDirection(searchParams.get("direction"));
  const [searchInput, setSearchInput] = React.useState(urlSearch);
  const { data, error, isFetching, isLoading, refetch } = useCustomerSearch({
    search: urlSearch,
    page,
    sort,
    direction,
  });
  const customers = data?.data ?? [];
  const lastPage = Math.max(1, data?.meta?.last_page ?? 1);

  React.useEffect(() => {
    setSearchInput(urlSearch);
  }, [urlSearch]);

  const updateUrl = React.useCallback(
    ({
      search,
      nextPage,
      sort: nextSort,
      direction: nextDirection,
    }: {
      search?: string;
      nextPage?: number;
      sort?: CustomerSortField;
      direction?: CustomerSortDirection;
    }) => {
      const params = new URLSearchParams(searchParams.toString());
      const normalizedSearch = search?.trim() ?? urlSearch;
      const normalizedPage = nextPage ?? page;

      if (normalizedSearch) {
        params.set("search", normalizedSearch);
      } else {
        params.delete("search");
      }

      if (normalizedPage > 1) {
        params.set("page", String(normalizedPage));
      } else {
        params.delete("page");
      }

      if (nextSort) {
        params.set("sort", nextSort);
        params.set("direction", nextDirection ?? "asc");
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [page, pathname, router, searchParams, urlSearch],
  );

  const handleSort = (field: CustomerSortField) => {
    const nextDirection: CustomerSortDirection =
      sort === field && direction === "asc" ? "desc" : "asc";

    updateUrl({ sort: field, direction: nextDirection, nextPage: 1 });
  };

  if (error) {
    return (
      <EmptyState
        title="Não foi possível carregar os clientes"
        description="Tente novamente em instantes."
        action={<Button onClick={() => void refetch()}>Tentar novamente</Button>}
      />
    );
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Clientes</h1>
        <p className="text-sm leading-6 text-slate-600">
          Consulte os clientes registados e a quantidade de pedidos de cada um.
        </p>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <OrderSearch
          value={searchInput}
          onChange={setSearchInput}
          onSubmit={() => updateUrl({ search: searchInput, nextPage: 1 })}
          onClear={() => {
            setSearchInput("");
            updateUrl({ search: "", nextPage: 1 });
          }}
          loading={isFetching}
          label="Pesquisar cliente"
          placeholder="Pesquisar por nome ou telefone"
          helpTextIdle="Pesquise pelo nome ou telefone para localizar rapidamente um cliente."
          helpTextLoading="A procurar clientes no backend..."
        />
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            title="Nenhum cliente encontrado"
            description={
              urlSearch
                ? "Ajuste a pesquisa por nome ou telefone e tente novamente."
                : "Ainda não existem clientes registados."
            }
            className="m-5"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead label="Nome" field="name" activeField={sort} direction={direction} onSort={handleSort} />
                <SortableTableHead label="Telefone" field="phone" activeField={sort} direction={direction} onSort={handleSort} />
                <SortableTableHead label="Pedidos" field="orders_count" activeField={sort} direction={direction} align="right" onSort={handleSort} />
                <SortableTableHead label="Total" field="orders_total" activeField={sort} direction={direction} align="right" onSort={handleSort} />
                <TableHead className="w-28 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium text-slate-950">{customer.name}</TableCell>
                  <TableCell>{customer.phone ?? "Não registado"}</TableCell>
                  <TableCell className="text-right">{customer.ordersCount}</TableCell>
                  <TableCell className="text-right">{formatCurrency(customer.ordersTotal)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/customers/${customer.id}`)}
                    >
                      Abrir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {lastPage > 1 ? (
        <div className="flex justify-end rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateUrl({ nextPage: page - 1 })}
            >
              Anterior
            </Button>
            <span>
              Página {page} de {lastPage}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= lastPage}
              onClick={() => updateUrl({ nextPage: page + 1 })}
            >
              Seguinte
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
