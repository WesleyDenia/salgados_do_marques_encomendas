"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, X } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCustomerDetail,
  useUpdateCustomer,
} from "@/features/customers/hooks/use-customer-search";
import type { CustomerDetail, CustomerUpdatePayload } from "@/features/customers/types";
import { useOrderSettings } from "@/features/orders/hooks/use-order-queries";
import { formatDate, formatDateTime } from "@/lib/formatters/date";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

function formatCurrency(value: number | undefined) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(value ?? 0);
}

function formatPickupDate(date: string | null | undefined, time: string | null | undefined) {
  const formattedDate = formatDate(date);

  return time ? `${formattedDate} ${time.slice(0, 5)}` : formattedDate;
}

function CustomerField({ label, value }: Readonly<{ label: string; value: string | null | undefined }>) {
  return (
    <div className="rounded-xl border border-slate-200 px-3 py-2.5">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-slate-900">{value || "—"}</dd>
    </div>
  );
}

function CustomerEditModal({
  customer,
  open,
  onOpenChange,
}: Readonly<{
  customer: CustomerDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  const { toast } = useToast();
  const updateCustomer = useUpdateCustomer(customer.id);
  const [form, setForm] = React.useState<CustomerUpdatePayload>({
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    nif: customer.nif,
    birthDate: customer.birthDate,
  });

  React.useEffect(() => {
    if (open) {
      setForm({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        nif: customer.nif,
        birthDate: customer.birthDate,
      });
    }
  }, [customer, open]);

  if (!open) return null;

  const updateField = <K extends keyof CustomerUpdatePayload>(key: K, value: CustomerUpdatePayload[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    updateCustomer.mutate(form, {
      onSuccess: () => {
        toast("Dados do cliente atualizados com sucesso.", "success");
        onOpenChange(false);
      },
      onError: () => toast("Não foi possível atualizar os dados do cliente.", "error"),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/40"
        aria-label="Fechar edição do cliente"
        onClick={() => onOpenChange(false)}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-edit-title"
        className="relative w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="customer-edit-title" className="text-xl font-semibold text-slate-950">
              Editar cliente
            </h2>
            <p className="mt-1 text-sm text-slate-600">Atualize os dados de contacto e identificação.</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Fechar">
            <X className="size-4" />
          </Button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Nome
            <Input required value={form.name} onChange={(event) => updateField("name", event.target.value)} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              Telefone
              <Input value={form.phone ?? ""} onChange={(event) => updateField("phone", event.target.value || null)} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              NIF
              <Input value={form.nif ?? ""} onChange={(event) => updateField("nif", event.target.value || null)} />
            </label>
          </div>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Email
            <Input required type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Data de nascimento
            <Input type="date" value={form.birthDate ?? ""} onChange={(event) => updateField("birthDate", event.target.value || null)} />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={updateCustomer.isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateCustomer.isPending}>
              {updateCustomer.isPending ? "A guardar…" : "Guardar alterações"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function CustomerDetailRecord({ customerId }: Readonly<{ customerId: string }>) {
  const [editOpen, setEditOpen] = React.useState(false);
  const customerQuery = useCustomerDetail(customerId);
  const settingsQuery = useOrderSettings();

  if (customerQuery.isLoading) {
    return <div className="h-96 animate-pulse rounded-3xl bg-slate-100" />;
  }

  if (customerQuery.error || !customerQuery.data) {
    return (
      <EmptyState
        title="Não foi possível carregar o cliente"
        description="Tente novamente em instantes."
        action={<Button onClick={() => void customerQuery.refetch()}>Tentar novamente</Button>}
      />
    );
  }

  const customer = customerQuery.data;
  const latestOrder = customer.orders[0];

  return (
    <section className="space-y-6">
      <header className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{customer.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Cliente #{customer.id} criado em {formatDateTime(customer.createdAt)}
          </p>
        </div>
        <Link href="/customers" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          <ArrowLeft className="size-3.5" />
          Voltar para a lista
        </Link>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Dados do utilizador</h2>
              <p className="mt-1 text-sm text-slate-500">Dados de cadastro do cliente num único ponto de consulta.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="size-3.5" />
              Editar
            </Button>
          </div>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <CustomerField label="Email" value={customer.email} />
            <CustomerField label="Telefone" value={customer.phone} />
            <CustomerField label="NIF" value={customer.nif} />
            <CustomerField label="Nascimento" value={formatDate(customer.birthDate)} />
          </dl>
        </section>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total de pedidos</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{customer.ordersCount}</p>
          </section>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Acessos rápidos</h2>
            <p className="mt-1 text-sm text-slate-500">Consulta direta de elementos relacionados ao cliente.</p>
            {latestOrder ? (
              <Link
                href={`/orders/${latestOrder.id}/edit`}
                className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "mt-4 w-full")}
              >
                Abrir pedido mais recente
              </Link>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Este cliente ainda não tem pedidos.</p>
            )}
          </section>
        </aside>
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 pb-4">
          <h2 className="text-base font-semibold text-slate-950">Pedidos do cliente</h2>
          <p className="mt-1 text-sm text-slate-500">Histórico de encomendas, ordenado pela data de retirada mais recente.</p>
        </div>
        {customer.orders.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-slate-500">Este cliente ainda não realizou pedidos.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Pedido</TableHead>
                <TableHead>Data de entrada</TableHead>
                <TableHead>Data de retirada</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customer.orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium text-slate-950">#{order.id}</TableCell>
                  <TableCell>{formatDateTime(order.createdAt)}</TableCell>
                  <TableCell>{formatPickupDate(order.pickupDate, order.pickupTime)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(order.total)}</TableCell>
                  <TableCell>{settingsQuery.data?.statusLabels?.[order.status] ?? order.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <CustomerEditModal customer={customer} open={editOpen} onOpenChange={setEditOpen} />
    </section>
  );
}
