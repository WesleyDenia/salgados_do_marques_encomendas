"use client";

import * as React from "react";
import { AlertTriangle, Clock3, Info, ShieldAlert } from "lucide-react";

import { formatHistoryRelativeTime } from "@/features/orders/components/order-history-list";
import {
  safeDetectOrderAnomalies,
  type OrderAnomaly,
} from "@/features/orders/utils/order-anomaly-detector";
import {
  ORDER_PAYMENT_STATUS_LABELS,
  ORDER_SLOT_LABELS,
  type Order,
  type OrderHistoryEntry,
} from "@/features/orders/types";
import { formatOperationalDateTime } from "@/features/orders/utils/operational-timezone";
import { cn } from "@/lib/utils";

const ORDER_CHANGE_FIELD_LABELS: Record<string, string> = {
  status: "Estado",
  payment_status: "Estado do pagamento",
  slot: "Slot",
  scheduled_at: "Agendamento",
  store_id: "Loja",
  notes: "Notas",
  customer_name: "Cliente",
  customer_contact: "Contacto",
  cancelled_at: "Cancelamento",
  items: "Itens",
  phone: "Contacto",
  email: "Email",
  nif: "NIF",
  tax_id: "NIF",
  token: "Token",
  payload: "Payload externo",
  response: "Resposta externa",
  raw: "Payload bruto",
};

const CRITICAL_FIELDS = new Set([
  "status",
  "cancelled_at",
  "payment_status",
  "scheduled_at",
  "store_id",
  "slot",
  "items",
]);

const SENSITIVE_FIELDS = new Set([
  "customer_contact",
  "phone",
  "email",
  "nif",
  "tax_id",
  "token",
  "payload",
  "response",
  "raw",
]);

const CRITICAL_ACTIONS = new Set([
  "status_updated",
  "status_changed",
  "payment_updated",
  "cancelled",
  "canceled",
  "slot_changed",
  "items_updated",
]);

type OrderAuditSummaryOptions = {
  statusLabels?: Record<string, string>;
  timeZone?: string;
};

type OrderAuditSignal = {
  id: string;
  actionLabel: string;
  actor: string;
  createdAtLabel: string;
  createdAtTitle: string;
  severity: "critical" | "info";
  changedFieldLabels: string[];
  flaggedFieldLabels: string[];
  changeLines: string[];
  currentStateRelation: string;
};

export type OrderAuditSummary = {
  criticalCount: number;
  latestCriticalActionLabel: string | null;
  latestCriticalActor: string | null;
  latestCriticalAt: string | null;
  flaggedFieldLabels: string[];
  signals: OrderAuditSignal[];
};

const ANOMALY_SEVERITY_META: Record<
  OrderAnomaly["severity"],
  { tone: string; badgeTone: string }
> = {
  CRITICAL: {
    tone: "border-destructive/30 bg-destructive/5",
    badgeTone: "bg-destructive/10 text-destructive",
  },
  HIGH: {
    tone: "border-amber-500/30 bg-amber-500/5",
    badgeTone: "bg-amber-500/10 text-amber-700",
  },
  MEDIUM: {
    tone: "border-primary/20 bg-primary/5",
    badgeTone: "bg-primary/10 text-primary",
  },
  INFO: {
    tone: "border-border/70 bg-background/80",
    badgeTone: "bg-muted text-foreground",
  },
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

function humanizeField(key: string) {
  return ORDER_CHANGE_FIELD_LABELS[key] ?? key.replaceAll("_", " ");
}

function isSensitiveField(key: string) {
  return SENSITIVE_FIELDS.has(key);
}

function isFlaggedField(key: string) {
  return CRITICAL_FIELDS.has(key) || SENSITIVE_FIELDS.has(key);
}

function maskContact(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 0) {
    return "***";
  }

  const suffix = digits.slice(-3);
  return `${"*".repeat(Math.max(3, digits.length - suffix.length))}${suffix}`;
}

function shouldSuppressRawValue(key: string) {
  return ["nif", "tax_id", "token", "payload", "response", "raw"].includes(key);
}

function formatAuditScalarValue(
  key: string,
  value: unknown,
  order: Order,
  options: OrderAuditSummaryOptions,
) {
  if (value === null || value === undefined || value === "") {
    return "(vazio)";
  }

  if (key === "email" || shouldSuppressRawValue(key)) {
    return "valor sensível suprimido";
  }

  const numericValue = asFiniteNumber(value);

  if (key === "customer_contact" || key === "phone") {
    if (typeof value === "string") {
      return maskContact(value);
    }

    if (numericValue !== null) {
      return maskContact(String(numericValue));
    }
  }

  if (key === "status" && typeof value === "string") {
    return options.statusLabels?.[value] ?? value;
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

  if (key === "scheduled_at" && typeof value === "string") {
    return formatOperationalDateTime(value, options.timeZone);
  }

  if (key === "cancelled_at" && typeof value === "string") {
    return formatOperationalDateTime(value, options.timeZone);
  }

  if (key === "store_id" && isRecord(value)) {
    const id = asFiniteNumber(value.id);
    const name = typeof value.name === "string" ? value.name.trim() : "";

    if (name) {
      return name;
    }

    if (id !== null) {
      return order.store?.id === id && order.store.name
        ? order.store.name
        : `Loja #${id}`;
    }
  }

  if (key === "store_id" && numericValue !== null) {
    return order.store?.id === numericValue && order.store.name
      ? order.store.name
      : `Loja #${numericValue}`;
  }

  if (key === "items") {
    return "itens alterados";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
}

function formatAuditChangeLine(
  key: string,
  value: unknown,
  order: Order,
  options: OrderAuditSummaryOptions,
) {
  const label = humanizeField(key);

  if (isSensitiveField(key)) {
    if (key === "customer_contact" || key === "phone") {
      const tuple = toChangeTuple(value);

      if (tuple) {
        const previous = formatAuditScalarValue(key, tuple[0], order, options);
        const next = formatAuditScalarValue(key, tuple[1], order, options);

        if (previous && next) {
          return `${label}: ${previous} → ${next}`;
        }
      }
    }

    return `${label}: valor sensível suprimido`;
  }

  if (key === "items") {
    return "Itens alterados";
  }

  const tuple = toChangeTuple(value);

  if (!tuple) {
    return `${label}: valor alterado`;
  }

  const previous = formatAuditScalarValue(key, tuple[0], order, options);
  const next = formatAuditScalarValue(key, tuple[1], order, options);

  if (previous === null || next === null) {
    return `${label}: valor alterado`;
  }

  return `${label}: ${previous} → ${next}`;
}

function normalizeAuditActionLabel(action: string) {
  switch (action) {
    case "status_updated":
    case "status_changed":
      return "Estado operacional atualizado";
    case "payment_updated":
      return "Pagamento atualizado";
    case "order_corrected":
    case "updated":
      return "Correção da encomenda";
    case "cancelled":
    case "canceled":
      return "Cancelamento";
    case "slot_changed":
      return "Slot alterado";
    case "items_updated":
      return "Itens atualizados";
    default:
      return /^[a-z][a-z0-9_]{0,40}$/i.test(action)
        ? action.replaceAll("_", " ")
        : "Ação auditável não classificada";
  }
}

function isCriticalEntry(entry: OrderHistoryEntry) {
  if (CRITICAL_ACTIONS.has(entry.action)) {
    return true;
  }

  if (!isRecord(entry.changes)) {
    return false;
  }

  return Object.keys(entry.changes).some((key) => CRITICAL_FIELDS.has(key));
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

function matchesCurrentState(key: string, nextValue: unknown, order: Order) {
  switch (key) {
    case "status":
      return typeof nextValue === "string" && nextValue === order.status;
    case "payment_status":
      return typeof nextValue === "string" && nextValue === order.paymentStatus;
    case "slot":
      return typeof nextValue === "string" && nextValue === order.slot;
    case "store_id": {
      const currentStoreId = order.store?.id ?? null;
      const changedStoreId = isRecord(nextValue)
        ? asFiniteNumber(nextValue.id)
        : asFiniteNumber(nextValue);

      return currentStoreId !== null && changedStoreId !== null && currentStoreId === changedStoreId;
    }
    case "scheduled_at":
    case "cancelled_at": {
      if (typeof nextValue !== "string") {
        return false;
      }

      const currentValue =
        key === "scheduled_at" ? order.scheduledAt : order.cancelledAt;

      if (!currentValue) {
        return false;
      }

      const currentTime = new Date(currentValue).getTime();
      const nextTime = new Date(nextValue).getTime();

      return !Number.isNaN(currentTime) && !Number.isNaN(nextTime) && currentTime === nextTime;
    }
    default:
      return false;
  }
}

function buildCurrentStateRelation(
  entry: OrderHistoryEntry,
  order: Order,
) {
  if (!isRecord(entry.changes)) {
    return "Sem relação determinística com o estado atual.";
  }

  const matchedFields: string[] = [];
  let hasDeterministicCandidates = false;

  for (const [key, value] of Object.entries(entry.changes)) {
    const tuple = toChangeTuple(value);

    if (!tuple) {
      continue;
    }

    if (!["status", "payment_status", "slot", "scheduled_at", "store_id", "cancelled_at"].includes(key)) {
      continue;
    }

    hasDeterministicCandidates = true;

    if (matchesCurrentState(key, tuple[1], order)) {
      matchedFields.push(humanizeField(key));
    }
  }

  if (matchedFields.length > 0) {
    return `Alterou para o valor atual em ${matchedFields.join(", ")}.`;
  }

  if (hasDeterministicCandidates) {
    return "Alteração histórica sem correspondência direta com o estado atual.";
  }

  return "Sem relação determinística com o estado atual.";
}

function shouldIncludeInAudit(entry: OrderHistoryEntry) {
  if (entry.action === "created") {
    return false;
  }

  if (CRITICAL_ACTIONS.has(entry.action)) {
    return true;
  }

  if (!isRecord(entry.changes)) {
    return true;
  }

  return Object.keys(entry.changes).length > 0;
}

export function buildOrderAuditSummary(
  order: Order,
  options: OrderAuditSummaryOptions = {},
): OrderAuditSummary {
  const timeZone = options.timeZone ?? "Europe/Lisbon";
  const resolvedOptions = { ...options, timeZone };
  const rawHistory = Array.isArray(order.history) ? order.history : [];
  const history = rawHistory.filter((entry) => isRecord(entry));
  const signals = sortHistoryDescending(history)
    .filter(shouldIncludeInAudit)
    .map<OrderAuditSignal>((entry) => {
      const changedFieldKeys = isRecord(entry.changes)
        ? Object.keys(entry.changes)
        : [];
      const changedFieldLabels = changedFieldKeys.map(humanizeField);
      const flaggedFieldLabels = changedFieldKeys
        .filter(isFlaggedField)
        .map(humanizeField);
      const changeLines = isRecord(entry.changes)
        ? Object.entries(entry.changes).map(([key, value]) =>
            formatAuditChangeLine(key, value, order, resolvedOptions),
          )
        : [];
      const createdAtTitle = formatOperationalDateTime(entry.createdAt, timeZone);

      return {
        id: `${entry.id}-${entry.createdAt ?? ""}-${entry.action}`,
        actionLabel: normalizeAuditActionLabel(entry.action),
        actor: entry.user?.name?.trim() || "Sistema",
        createdAtLabel: formatHistoryRelativeTime(entry.createdAt, timeZone),
        createdAtTitle,
        severity: isCriticalEntry(entry) ? "critical" : "info",
        changedFieldLabels,
        flaggedFieldLabels,
        changeLines,
        currentStateRelation: buildCurrentStateRelation(entry, order),
      };
    });

  const criticalSignals = signals.filter((signal) => signal.severity === "critical");
  const latestCritical = criticalSignals[0] ?? null;
  const flaggedFieldLabels = Array.from(
    new Set(signals.flatMap((signal) => signal.flaggedFieldLabels)),
  );

  return {
    criticalCount: criticalSignals.length,
    latestCriticalActionLabel: latestCritical?.actionLabel ?? null,
    latestCriticalActor: latestCritical?.actor ?? null,
    latestCriticalAt: latestCritical?.createdAtTitle ?? null,
    flaggedFieldLabels,
    signals,
  };
}

function OrderAuditFallback({
  tone,
  message,
}: Readonly<{ tone: "loading" | "empty" | "error"; message: string }>) {
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

export function OrderAuditContext({
  order,
  statusLabels,
  timeZone = "Europe/Lisbon",
  loading = false,
  error = false,
}: Readonly<{
  order: Order;
  statusLabels?: Record<string, string>;
  timeZone?: string;
  loading?: boolean;
  error?: boolean;
}>) {
  return (
    <section className="space-y-3" aria-labelledby="order-audit-heading">
      <div className="flex items-center justify-between gap-3">
        <h3
          id="order-audit-heading"
          className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground"
        >
          Contexto de Auditoria
        </h3>
        <span className="text-xs text-muted-foreground">Apenas leitura</span>
      </div>

      {loading ? (
        <OrderAuditFallback
          tone="loading"
          message="A carregar contexto de auditoria..."
        />
      ) : error ? (
        <OrderAuditFallback
          tone="error"
          message="Não foi possível derivar o contexto de auditoria. O restante detalhe continua disponível."
        />
      ) : (
        <OrderAuditDiagnosticsBoundary>
          <OrderAuditInsights
            order={order}
            statusLabels={statusLabels}
            timeZone={timeZone}
          />
        </OrderAuditDiagnosticsBoundary>
      )}
    </section>
  );
}

class OrderAuditDiagnosticsBoundary extends React.Component<
  Readonly<{ children: React.ReactNode }>,
  Readonly<{ errorMessage: string | null }>
> {
  constructor(props: Readonly<{ children: React.ReactNode }>) {
    super(props);
    this.state = { errorMessage: null };
  }

  static getDerivedStateFromError(error: unknown) {
    const errorMessage =
      error instanceof Error && error.message.trim().length > 0
        ? error.message.trim()
        : "Falha técnica";

    return { errorMessage };
  }

  render() {
    if (this.state.errorMessage) {
      return (
        <OrderAuditFallback
          tone="error"
          message={`Análise de integridade falhou: ${this.state.errorMessage}`}
        />
      );
    }

    return this.props.children;
  }
}

function OrderAuditInsights({
  order,
  statusLabels,
  timeZone = "Europe/Lisbon",
}: Readonly<{
  order: Order;
  statusLabels?: Record<string, string>;
  timeZone?: string;
}>) {
  const summary = React.useMemo(
    () => buildOrderAuditSummary(order, { statusLabels, timeZone }),
    [order, statusLabels, timeZone],
  );
  const diagnosticResult = React.useMemo(
    () => safeDetectOrderAnomalies(order, { timeZone }),
    [order, timeZone],
  );
  const anomalies = diagnosticResult.anomalies;

  if (diagnosticResult.error) {
    return (
      <OrderAuditFallback
        tone="error"
        message={`Análise de integridade falhou: ${diagnosticResult.error}`}
      />
    );
  }

  if (summary.signals.length === 0 && anomalies.length === 0) {
    return (
      <OrderAuditFallback
        tone="empty"
        message="Sem alertas auditáveis relevantes para além da criação da encomenda."
      />
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-card/60 p-4">
      <div className="space-y-3 rounded-lg border border-border/70 bg-background/80 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Alertas de Diagnóstico
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Sinais de integridade derivados sem introduzir ações de edição nesta vista.
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {anomalies.length === 1 ? "1 alerta" : `${anomalies.length} alertas`}
          </span>
        </div>

        {anomalies.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum conflito ou lacuna adicional foi detetado na análise atual.
          </p>
        ) : (
          <ol className="space-y-3">
            {anomalies.map((anomaly) => (
              <li
                key={anomaly.code}
                className={cn(
                  "rounded-lg border px-4 py-3",
                  ANOMALY_SEVERITY_META[anomaly.severity].tone,
                )}
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {anomaly.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {anomaly.description}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.14em]",
                      ANOMALY_SEVERITY_META[anomaly.severity].badgeTone,
                    )}
                  >
                    {anomaly.severity}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-border/70 bg-background/80 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Eventos críticos
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {summary.criticalCount}
          </p>
        </div>
        <div className="rounded-lg border border-border/70 bg-background/80 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Última ação crítica
          </p>
          <p className="mt-2 text-sm font-medium text-foreground">
            {summary.latestCriticalActionLabel ?? "Sem eventos críticos"}
          </p>
          {summary.latestCriticalActor ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.latestCriticalActor}
            </p>
          ) : null}
        </div>
        <div className="rounded-lg border border-border/70 bg-background/80 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Momento operacional
          </p>
          <p className="mt-2 text-sm font-medium text-foreground">
            {summary.latestCriticalAt ?? "Sem data crítica"}
          </p>
        </div>
        <div className="rounded-lg border border-border/70 bg-background/80 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Campos sinalizados
          </p>
          <p className="mt-2 text-sm font-medium text-foreground">
            {summary.flaggedFieldLabels.join(", ") || "Sem campos sinalizados"}
          </p>
        </div>
      </div>

      <ol className="space-y-3">
        {summary.signals.map((signal) => {
          const Icon =
            signal.severity === "critical" ? ShieldAlert : AlertTriangle;

          return (
            <li
              key={signal.id}
              className={cn(
                "rounded-lg border px-4 py-3",
                signal.severity === "critical"
                  ? "border-destructive/30 bg-destructive/5"
                  : "border-border/70 bg-background/80",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    signal.severity === "critical"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {signal.actionLabel}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {signal.severity === "critical" ? "Crítico" : "Informativo"} · {signal.actor}
                      </p>
                    </div>
                    <time
                      dateTime={signal.createdAtTitle}
                      title={signal.createdAtTitle}
                      className="text-xs text-muted-foreground"
                    >
                      {signal.createdAtLabel}
                    </time>
                  </div>

                  {signal.changeLines.length > 0 ? (
                    <ul className="space-y-1 text-sm leading-6 text-muted-foreground">
                      {signal.changeLines.map((line, index) => (
                        <li key={`${signal.id}-${index}`}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Alteração auditável sem detalhe adicional legível.
                    </p>
                  )}

                  <div className="flex items-start gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                    <Clock3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <p>{signal.currentStateRelation}</p>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex items-start gap-2 rounded-md border border-border/70 bg-background/80 px-3 py-2 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>
          Sinais derivados de <code>order.history</code> sem inferir causa,
          culpa ou ação corretiva.
        </p>
      </div>
    </div>
  );
}
