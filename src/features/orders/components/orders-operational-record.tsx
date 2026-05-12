"use client";

import * as React from "react";
import { format } from "date-fns";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOrders } from "@/features/orders/hooks/use-order-queries";
import type { Order } from "@/features/orders/types";

const paymentStatusLabels = {
  pending: "Pendente",
  partial: "Parcial",
  paid: "Pago",
} as const;

const slotLabels = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
} as const;

function formatScheduledAt(value?: string | null) {
  if (!value) {
    return "Por agendar";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return format(parsed, "dd/MM/yyyy HH:mm");
}

function formatTotal(value?: number) {
  if (typeof value !== "number") {
    return "-";
  }

  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function buildItemsSummary(items: Order["items"]) {
  if (items.length === 0) {
    return "Sem itens";
  }

  return items
    .map((item) => `${item.quantity}x ${item.productName}`)
    .join(", ");
}

function buildCustomerLabel(order: Order) {
  return order.customerName ?? order.user?.name ?? "Cliente não identificado";
}

function buildPaymentLabel(order: Order) {
  if (!order.paymentStatus) {
    return "Não definido";
  }

  return paymentStatusLabels[order.paymentStatus] ?? order.paymentStatus;
}

function buildSlotLabel(order: Order) {
  if (!order.slot) {
    return "Não definido";
  }

  return slotLabels[order.slot] ?? order.slot;
}

export function OrdersOperationalRecordContent({
  orders,
}: Readonly<{
  orders: Order[];
}>) {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">
          Registo operacional
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          As encomendas confirmadas no backend ficam visíveis aqui assim que a
          lista é recarregada pela invalidação do TanStack Query.
        </p>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card/90">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Loja</TableHead>
              <TableHead>Agendamento</TableHead>
              <TableHead>Slot</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">#{order.id}</TableCell>
                <TableCell>{buildCustomerLabel(order)}</TableCell>
                <TableCell>{order.store?.name ?? "Loja não carregada"}</TableCell>
                <TableCell>{formatScheduledAt(order.scheduledAt)}</TableCell>
                <TableCell>{buildSlotLabel(order)}</TableCell>
                <TableCell>{buildPaymentLabel(order)}</TableCell>
                <TableCell>{order.status}</TableCell>
                <TableCell>{buildItemsSummary(order.items)}</TableCell>
                <TableCell>{formatTotal(order.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {orders.map((order) => (
          <article
            key={`notes-${order.id}`}
            className="rounded-2xl border border-border/70 bg-background p-4"
          >
            <p className="text-sm font-medium text-foreground">
              Encomenda #{order.id} · {buildCustomerLabel(order)}
            </p>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
              {order.notes?.trim() || "Sem notas operacionais persistidas."}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function OrdersOperationalRecord() {
  const { data, isLoading, error } = useOrders();

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-border/70 bg-card/80 p-5 text-sm text-muted-foreground">
        A carregar registo operacional de encomendas...
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
        Não foi possível carregar o registo operacional. Verifique a sessão e a
        disponibilidade do backend.
      </section>
    );
  }

  const orders = data?.data ?? [];

  if (orders.length === 0) {
    return (
      <section className="rounded-2xl border border-border/70 bg-card/80 p-5 text-sm text-muted-foreground">
        Ainda não existem encomendas visíveis no registo operacional.
      </section>
    );
  }

  return <OrdersOperationalRecordContent orders={orders} />;
}
