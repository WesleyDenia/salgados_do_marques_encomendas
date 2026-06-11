"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FilePenLine,
  Info,
} from "lucide-react";

import {
  ORDER_PAYMENT_STATUS_LABELS,
  ORDER_SLOT_LABELS,
  type Order,
  type OrderHistoryEntry,
} from "@/features/orders/types";
import {
  formatOperationalDateTime,
  getZonedParts,
} from "@/features/orders/utils/operational-timezone";
import { cn } from "@/lib/utils";

type OrderHistoryActionMeta = {
  label: string;
  tone: "critical" | "warning" | "info";
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

type OrderChangeFormatContext = {
  statusLabels?: Record<string, string>;
  storeNamesById?: Record<number, string>;
  variantNamesById?: Record<number, string>;
  timeZone?: string;
};

const ORDER_HISTORY_ACTIONS: Record<string, OrderHistoryActionMeta> = {
  status_updated: {
    label: "Estado operacional atualizado",
    tone: "critical",
    icon: AlertTriangle,
  },
  status_changed: {
    label: "Estado operacional atualizado",
    tone: "critical",
    icon: AlertTriangle,
  },
  payment_updated: {
    label: "Pagamento atualizado",
    tone: "info",
    icon: CheckCircle2,
  },
  order_corrected: {
    label: "Correção da encomenda",
    tone: "info",
    icon: FilePenLine,
  },
  updated: {
    label: "Correção da encomenda",
    tone: "info",
    icon: FilePenLine,
  },
  cancelled: {
    label: "Cancelamento",
    tone: "critical",
    icon: AlertTriangle,
  },
  canceled: {
    label: "Cancelamento",
    tone: "critical",
    icon: AlertTriangle,
  },
  slot_changed: {
    label: "Slot alterado",
    tone: "warning",
    icon: Clock,
  },
  items_updated: {
    label: "Itens atualizados",
    tone: "info",
    icon: FilePenLine,
  },
};

const ORDER_CHANGE_FIELD_LABELS: Record<string, string> = {
  status: "Estado",
  payment_status: "Estado do pagamento",
  slot: "Slot",
  scheduled_at: "Agendamento",
  store_id: "Loja",
  notes: "Notas",
  customer_name: "Cliente",
  customer_contact: "Contacto",
  total: "Total",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toChangeTuple(value: unknown): [unknown, unknown] | null {
  if (Array.isArray(value) && value.length >= 2) {
    return [value[0], value[1]];
  }

  if (isRecord(value) && ("from" in value || "to" in value)) {
    return [value.from, value.to];
  }

  return null;
}

function asFiniteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatScalarValue(
  key: string,
  value: unknown,
  context: OrderChangeFormatContext,
) {
  if (value === null || value === undefined || value === "") {
    return "(vazio)";
  }

  const numericValue = asFiniteNumber(value);

  if (key === "store_id" && isRecord(value)) {
    const id = asFiniteNumber(value.id);
    const name = typeof value.name === "string" ? value.name.trim() : "";

    if (name) {
      return name;
    }

    if (id !== null) {
      return context.storeNamesById?.[id] ?? `Loja #${id}`;
    }
  }

  if (key === "store_id" && numericValue !== null) {
    return context.storeNamesById?.[numericValue] ?? `Loja #${numericValue}`;
  }

  if (key === "variant_id" && isRecord(value)) {
    const id = asFiniteNumber(value.id);
    const name =
      typeof value.name === "string"
        ? value.name.trim()
        : typeof value.name_snapshot === "string"
          ? value.name_snapshot.trim()
          : "";

    if (name) {
      return name;
    }

    if (id !== null) {
      return context.variantNamesById?.[id] ?? `Variação #${id}`;
    }
  }

  if (key === "variant_id" && numericValue !== null) {
    return context.variantNamesById?.[numericValue] ?? `Variação #${numericValue}`;
  }

  if (key === "status" && typeof value === "string") {
    return context.statusLabels?.[value] ?? value;
  }

  if (key === "payment_status" && typeof value === "string") {
    return (
      ORDER_PAYMENT_STATUS_LABELS[
        value as keyof typeof ORDER_PAYMENT_STATUS_LABELS
      ] ?? value
    );
  }

  if (key === "slot" && typeof value === "string") {
    return ORDER_SLOT_LABELS[value as keyof typeof ORDER_SLOT_LABELS] ?? value;
  }

  if (key === "total" && numericValue !== null) {
    return formatCurrency(numericValue);
  }

  if (key === "scheduled_at" && typeof value === "string") {
    return formatOperationalDateTime(value, context.timeZone);
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
}

export function formatOrderChange(
  key: string,
  values: [unknown, unknown],
  context: OrderChangeFormatContext = {},
) {
  if (key === "items") {
    return "Itens alterados";
  }

  const label = ORDER_CHANGE_FIELD_LABELS[key] ?? key.replaceAll("_", " ");
  const previous = formatScalarValue(key, values[0], context);
  const next = formatScalarValue(key, values[1], context);

  if (previous === null || next === null) {
    return `${label}: valor alterado`;
  }

  return `${label}: ${previous} → ${next}`;
}

function formatHistoryChanges(
  changes: OrderHistoryEntry["changes"],
  context: OrderChangeFormatContext,
) {
  if (!isRecord(changes)) {
    return [];
  }

  return Object.entries(changes)
    .map(([key, value]) => {
      const tuple = toChangeTuple(value);

      if (!tuple) {
        return key === "items"
          ? "Itens alterados"
          : `${ORDER_CHANGE_FIELD_LABELS[key] ?? key.replaceAll("_", " ")}: valor alterado`;
      }

      return formatOrderChange(key, tuple, context);
    })
    .filter((line) => line.trim().length > 0);
}

function getHistoryActionMeta(action: string): OrderHistoryActionMeta {
  return (
    ORDER_HISTORY_ACTIONS[action] ?? {
      label: action.replaceAll("_", " "),
      tone: "info",
      icon: Info,
    }
  );
}

function isSameOperationalDay(a: Date, b: Date, timeZone: string) {
  const left = getZonedParts(a, timeZone);
  const right = getZonedParts(b, timeZone);

  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day
  );
}

export function formatHistoryRelativeTime(
  value?: string | null,
  timeZone = "Europe/Lisbon",
  now = new Date(),
) {
  if (!value) {
    return "Data não registada";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  if (!isSameOperationalDay(parsed, now, timeZone)) {
    return formatOperationalDateTime(value, timeZone);
  }

  const diffSeconds = Math.round((parsed.getTime() - now.getTime()) / 1000);
  const absoluteSeconds = Math.abs(diffSeconds);
  const formatter = new Intl.RelativeTimeFormat("pt-PT", { numeric: "auto" });

  if (absoluteSeconds < 60) {
    return formatter.format(diffSeconds, "second");
  }

  const diffMinutes = Math.round(diffSeconds / 60);

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }

  return formatter.format(Math.round(diffMinutes / 60), "hour");
}

function buildStoreNamesById(order?: Order | null) {
  if (!order?.store?.id) {
    return {};
  }

  return { [order.store.id]: order.store.name };
}

function buildVariantNamesById(order?: Order | null) {
  return (order?.items ?? []).reduce<Record<number, string>>((accumulator, item) => {
    if (item.variantId != null && item.variantName) {
      accumulator[item.variantId] = item.variantName;
    }

    return accumulator;
  }, {});
}

class OrderHistoryErrorBoundary extends React.Component<
  React.PropsWithChildren,
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <OrderHistoryFallback
          tone="error"
          message="Não foi possível apresentar o histórico desta encomenda. O restante detalhe continua disponível."
        />
      );
    }

    return this.props.children;
  }
}

function OrderHistoryFallback({
  tone,
  message,
}: Readonly<{ tone: "empty" | "loading" | "error"; message: string }>) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        tone === "error"
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-dashed border-border/80 bg-muted/30 text-muted-foreground",
      )}
    >
      {message}
    </div>
  );
}

function sortHistoryDescending(history: OrderHistoryEntry[]) {
  return [...history].sort((left, right) => {
    const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;

    const leftInvalid = Number.isNaN(leftTime);
    const rightInvalid = Number.isNaN(rightTime);

    if (leftInvalid && rightInvalid) {
      return 0;
    }

    if (leftInvalid) {
      return 1;
    }

    if (rightInvalid) {
      return -1;
    }

    return rightTime - leftTime;
  });
}

class OrderHistoryEntryErrorBoundary extends React.Component<
  React.PropsWithChildren<{ resetKey: string }>,
  { hasError: boolean; resetKey: string }
> {
  state = { hasError: false, resetKey: this.props.resetKey };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  static getDerivedStateFromProps(
    props: React.PropsWithChildren<{ resetKey: string }>,
    state: { hasError: boolean; resetKey: string },
  ) {
    if (props.resetKey !== state.resetKey) {
      return { hasError: false, resetKey: props.resetKey };
    }

    return null;
  }

  render() {
    if (this.state.hasError) {
      return (
        <li className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Não foi possível apresentar esta entrada de histórico.
        </li>
      );
    }

    return this.props.children;
  }
}

function OrderHistoryEntryItem({
  entry,
  changeLines,
  timeZone,
}: Readonly<{
  entry: OrderHistoryEntry;
  changeLines: string[];
  timeZone: string;
}>) {
  const actionMeta = getHistoryActionMeta(entry.action);
  const Icon = actionMeta.icon;
  const absoluteTime = formatOperationalDateTime(entry.createdAt, timeZone);
  const relativeTime = formatHistoryRelativeTime(entry.createdAt, timeZone);

  return (
    <li
      data-critical={actionMeta.tone === "critical" ? "true" : undefined}
      className={cn(
        "rounded-lg border bg-background px-4 py-3",
        actionMeta.tone === "critical" &&
          "border-destructive/40 bg-destructive/5",
        actionMeta.tone === "warning" &&
          "border-amber-500/50 bg-amber-500/10",
        actionMeta.tone === "info" && "border-border/80",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            actionMeta.tone === "critical" &&
              "bg-destructive/10 text-destructive",
            actionMeta.tone === "warning" &&
              "bg-amber-500/15 text-amber-700",
            actionMeta.tone === "info" &&
              "bg-primary/10 text-primary",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {actionMeta.label}
              </p>
              <p className="text-xs text-muted-foreground">
                Por {entry.user?.name?.trim() || "Sistema"}
              </p>
            </div>
            <time
              dateTime={entry.createdAt ?? undefined}
              title={absoluteTime}
              className="text-xs text-muted-foreground"
            >
              {relativeTime}
            </time>
          </div>

          {changeLines.length > 0 ? (
            <ul className="space-y-1 text-sm leading-6 text-muted-foreground">
              {changeLines.map((line, index) => (
                <li key={`${line}-${index}`}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Alteração registada sem detalhe adicional legível.
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

export function OrderHistoryListContent({
  history,
  order,
  timeZone = "Europe/Lisbon",
  statusLabels,
}: Readonly<{
  history: OrderHistoryEntry[];
  order?: Order | null;
  timeZone?: string;
  statusLabels?: Record<string, string>;
}>) {
  const formatContext: OrderChangeFormatContext = {
    statusLabels,
    storeNamesById: buildStoreNamesById(order),
    variantNamesById: buildVariantNamesById(order),
    timeZone,
  };
  const sortedHistory = sortHistoryDescending(history);

  if (sortedHistory.length === 0) {
    return (
      <OrderHistoryFallback
        tone="empty"
        message="Sem alterações relevantes registadas para além da criação da encomenda."
      />
    );
  }

  return (
    <ol className="space-y-3">
      {sortedHistory.map((entry) => {
        const changeLines = formatHistoryChanges(entry.changes, formatContext);

        return (
          <OrderHistoryEntryErrorBoundary
            key={entry.id}
            resetKey={`${entry.id}-${entry.createdAt ?? ""}-${entry.action}`}
          >
            <OrderHistoryEntryItem
              entry={entry}
              changeLines={changeLines}
              timeZone={timeZone}
            />
          </OrderHistoryEntryErrorBoundary>
        );
      })}
    </ol>
  );
}

export function OrderHistoryList({
  history,
  order,
  timeZone = "Europe/Lisbon",
  statusLabels,
  loading = false,
  error = false,
}: Readonly<{
  history?: OrderHistoryEntry[] | null;
  order?: Order | null;
  timeZone?: string;
  statusLabels?: Record<string, string>;
  loading?: boolean;
  error?: boolean;
}>) {
  return (
    <section className="space-y-3" aria-labelledby="order-history-heading">
      <div className="flex items-center justify-between gap-3">
        <h3
          id="order-history-heading"
          className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground"
        >
          Histórico de Alterações
        </h3>
        <span className="text-xs text-muted-foreground">Apenas leitura</span>
      </div>

      {loading ? (
        <OrderHistoryFallback
          tone="loading"
          message="A carregar histórico de alterações..."
        />
      ) : error ? (
        <OrderHistoryFallback
          tone="error"
          message="Não foi possível carregar o histórico. O restante detalhe continua disponível."
        />
      ) : (
        <OrderHistoryErrorBoundary>
          <OrderHistoryListContent
            history={history ?? []}
            order={order}
            timeZone={timeZone}
            statusLabels={statusLabels}
          />
        </OrderHistoryErrorBoundary>
      )}
    </section>
  );
}
