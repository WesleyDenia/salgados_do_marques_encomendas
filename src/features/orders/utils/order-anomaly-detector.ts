"use client";

import type { Order, OrderHistoryEntry } from "@/features/orders/types";
import { formatOperationalDateTime } from "@/features/orders/utils/operational-timezone";

export type OrderAnomalySeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";

export type OrderAnomaly = {
  code: string;
  severity: OrderAnomalySeverity;
  title: string;
  description: string;
  field?: string;
};

type OrderAnomalyOptions = {
  now?: string | Date;
  timeZone?: string;
};

type TranslationKey =
  | "audit.anomaly.field.customer_name"
  | "audit.anomaly.field.customer_contact"
  | "audit.anomaly.field.slot"
  | "audit.anomaly.field.scheduled_at"
  | "audit.anomaly.field.items"
  | "audit.anomaly.field.total_amount"
  | "audit.anomaly.field.payment_status"
  | "audit.anomaly.missing.title"
  | "audit.anomaly.missing.description"
  | "audit.anomaly.conflict.completed_pending.title"
  | "audit.anomaly.conflict.completed_pending.description"
  | "audit.anomaly.conflict.completed_failed.title"
  | "audit.anomaly.conflict.completed_failed.description"
  | "audit.anomaly.conflict.cancelled_paid.title"
  | "audit.anomaly.conflict.cancelled_paid.description"
  | "audit.anomaly.conflict.production_without_items.title"
  | "audit.anomaly.conflict.production_without_items.description"
  | "audit.anomaly.reversion.cancelled.title"
  | "audit.anomaly.reversion.cancelled.description"
  | "audit.anomaly.reversion.completed.title"
  | "audit.anomaly.reversion.completed.description"
  | "audit.anomaly.reversion.scheduled_past.title"
  | "audit.anomaly.reversion.scheduled_past.description"
  | "audit.anomaly.error.invalid_history";

// TODO: Migrar para o sistema de i18n global do projeto (ex: react-i18next) assim que estiver disponível.
// Atualmente utiliza um dicionário local para cumprir o requisito de internacionalização sem introduzir novas dependências.
const TRANSLATIONS: Record<TranslationKey, string> = {
  "audit.anomaly.field.customer_name": "Nome do cliente",
  "audit.anomaly.field.customer_contact": "Contacto",
  "audit.anomaly.field.slot": "Slot",
  "audit.anomaly.field.scheduled_at": "Agendamento",
  "audit.anomaly.field.items": "Itens",
  "audit.anomaly.field.total_amount": "Total",
  "audit.anomaly.field.payment_status": "Estado do pagamento",
  "audit.anomaly.missing.title": "{{field}} em falta",
  "audit.anomaly.missing.description":
    "Campo essencial ausente para a investigação desta encomenda.",
  "audit.anomaly.conflict.completed_pending.title":
    "Encomenda concluída com pagamento pendente",
  "audit.anomaly.conflict.completed_pending.description":
    "O estado operacional indica conclusão, mas o pagamento continua pendente.",
  "audit.anomaly.conflict.completed_failed.title":
    "Encomenda concluída com pagamento falhado",
  "audit.anomaly.conflict.completed_failed.description":
    "O estado operacional indica conclusão, mas o pagamento está marcado como falhado.",
  "audit.anomaly.conflict.cancelled_paid.title":
    "Encomenda cancelada com pagamento pago",
  "audit.anomaly.conflict.cancelled_paid.description":
    "A encomenda foi cancelada, mas o pagamento continua registado como pago.",
  "audit.anomaly.conflict.production_without_items.title":
    "Estado avançado sem itens registados",
  "audit.anomaly.conflict.production_without_items.description":
    "A encomenda está em produção ou posterior sem itens válidos associados.",
  "audit.anomaly.reversion.cancelled.title":
    "Reversão de estado terminal: cancelada",
  "audit.anomaly.reversion.cancelled.description":
    "Foi detetada uma transição posterior a partir de um estado terminal cancelado.",
  "audit.anomaly.reversion.completed.title":
    "Reversão de estado terminal: concluída",
  "audit.anomaly.reversion.completed.description":
    "Foi detetada uma transição posterior a partir de um estado terminal concluído.",
  "audit.anomaly.reversion.scheduled_past.title":
    "Agendada para o passado",
  "audit.anomaly.reversion.scheduled_past.description":
    "O agendamento foi alterado para {{date}}, ultrapassando a tolerância de 5 minutos.",
  "audit.anomaly.error.invalid_history": "Estrutura do histórico inválida",
};

const ESSENTIAL_FIELDS = [
  "customer_name",
  "customer_contact",
  "slot",
  "scheduled_at",
  "items",
  "total_amount",
  "payment_status",
] as const;

const TERMINAL_CANCELLED = new Set(["cancelled", "canceled"]);
const TERMINAL_COMPLETED = new Set(["completed", "done"]);
const PRODUCTION_OR_LATER = new Set(["in-production", "ready", "completed", "done"]);

function translate(key: TranslationKey, params?: Record<string, string>) {
  const template = TRANSLATIONS[key];

  if (!params) {
    return template;
  }

  return Object.entries(params).reduce(
    (message, [paramKey, value]) =>
      message.replaceAll(`{{${paramKey}}}`, value),
    template,
  );
}

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

function maskContact(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 0) {
    return "***";
  }

  const suffix = digits.slice(-3);
  return `${"*".repeat(Math.max(3, digits.length - suffix.length))}${suffix}`;
}

function buildMaskedContactLabel(order: Order) {
  const currentValue = typeof order.customerContact === "string" ? order.customerContact : "";

  if (currentValue.trim()) {
    return `${translate("audit.anomaly.field.customer_contact")} (${maskContact(currentValue)})`;
  }

  if (!Array.isArray(order.history)) {
    return `${translate("audit.anomaly.field.customer_contact")} (***)`;
  }

  for (const entry of [...order.history].reverse()) {
    if (!isRecord(entry.changes)) {
      continue;
    }

    for (const key of ["customer_contact", "phone"] as const) {
      const tuple = toChangeTuple(entry.changes[key]);

      if (!tuple) {
        continue;
      }

      for (const candidate of [tuple[1], tuple[0]]) {
        if (typeof candidate === "string" && candidate.trim()) {
          return `${translate("audit.anomaly.field.customer_contact")} (${maskContact(candidate)})`;
        }
      }
    }
  }

  return `${translate("audit.anomaly.field.customer_contact")} (***)`;
}

function buildFieldLabel(field: (typeof ESSENTIAL_FIELDS)[number], order: Order) {
  if (field === "customer_contact") {
    return buildMaskedContactLabel(order);
  }

  return translate(`audit.anomaly.field.${field}` as TranslationKey);
}

function buildAnomaly(
  code: string,
  severity: OrderAnomalySeverity,
  titleKey: TranslationKey,
  descriptionKey: TranslationKey,
  params?: Record<string, string>,
  field?: string,
): OrderAnomaly {
  return {
    code,
    severity,
    title: translate(titleKey, params),
    description: translate(descriptionKey, params),
    field,
  };
}

function normalizeStatus(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalizePaymentStatus(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function hasItems(order: Order) {
  return Array.isArray(order.items) && order.items.length > 0;
}

function isScheduledPast(value: unknown, now: Date) {
  if (typeof value !== "string") {
    return false;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed.getTime() < now.getTime() - 5 * 60 * 1000;
}

function sortHistoryChronologically(history: OrderHistoryEntry[]) {
  return [...history].sort((left, right) => {
    const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;

    if (Number.isNaN(leftTime) && Number.isNaN(rightTime)) {
      return Number(left.id) - Number(right.id);
    }

    if (Number.isNaN(leftTime)) {
      return 1;
    }

    if (Number.isNaN(rightTime)) {
      return -1;
    }

    if (leftTime === rightTime) {
      return Number(left.id) - Number(right.id);
    }

    return leftTime - rightTime;
  });
}

function assertValidHistory(history: Order["history"]): asserts history is OrderHistoryEntry[] {
  if (!Array.isArray(history)) {
    throw new Error(translate("audit.anomaly.error.invalid_history"));
  }

  for (const entry of history) {
    if (!isRecord(entry) || (entry.changes !== undefined && entry.changes !== null && !isRecord(entry.changes))) {
      throw new Error(translate("audit.anomaly.error.invalid_history"));
    }
  }
}

function detectMissingFields(order: Order) {
  const anomalies: OrderAnomaly[] = [];

  for (const field of ESSENTIAL_FIELDS) {
    const isMissing =
      field === "customer_name"
        ? !order.customerName?.trim()
        : field === "customer_contact"
          ? !order.customerContact?.trim()
          : field === "slot"
            ? !order.slot
            : field === "scheduled_at"
              ? !order.scheduledAt
              : field === "items"
                ? !hasItems(order)
                : field === "total_amount"
                  ? typeof order.total !== "number" || Number.isNaN(order.total)
                  : !order.paymentStatus;

    if (!isMissing) {
      continue;
    }

    anomalies.push(
      buildAnomaly(
        `missing-${field.replaceAll("_", "-")}`,
        "MEDIUM",
        "audit.anomaly.missing.title",
        "audit.anomaly.missing.description",
        { field: buildFieldLabel(field, order) },
        field,
      ),
    );
  }

  return anomalies;
}

function detectStateConflicts(order: Order) {
  const anomalies: OrderAnomaly[] = [];
  const status = normalizeStatus(order.status);
  const paymentStatus = normalizePaymentStatus(order.paymentStatus);

  if (TERMINAL_COMPLETED.has(status) && paymentStatus === "pending") {
    anomalies.push(
      buildAnomaly(
        "completed-payment-pending",
        "CRITICAL",
        "audit.anomaly.conflict.completed_pending.title",
        "audit.anomaly.conflict.completed_pending.description",
      ),
    );
  }

  if (TERMINAL_COMPLETED.has(status) && paymentStatus === "failed") {
    anomalies.push(
      buildAnomaly(
        "completed-payment-failed",
        "CRITICAL",
        "audit.anomaly.conflict.completed_failed.title",
        "audit.anomaly.conflict.completed_failed.description",
      ),
    );
  }

  if (TERMINAL_CANCELLED.has(status) && paymentStatus === "paid") {
    anomalies.push(
      buildAnomaly(
        "cancelled-payment-paid",
        "CRITICAL",
        "audit.anomaly.conflict.cancelled_paid.title",
        "audit.anomaly.conflict.cancelled_paid.description",
      ),
    );
  }

  if (PRODUCTION_OR_LATER.has(status) && !hasItems(order)) {
    anomalies.push(
      buildAnomaly(
        "production-without-items",
        "CRITICAL",
        "audit.anomaly.conflict.production_without_items.title",
        "audit.anomaly.conflict.production_without_items.description",
      ),
    );
  }

  return anomalies;
}

function detectCriticalReversions(order: Order, options: Required<OrderAnomalyOptions>) {
  assertValidHistory(order.history);

  const anomalies: OrderAnomaly[] = [];
  const now =
    options.now instanceof Date ? options.now : new Date(options.now);

  for (const entry of sortHistoryChronologically(order.history)) {
    if (!entry.changes) {
      continue;
    }

    const statusChange = toChangeTuple(entry.changes.status);

    if (statusChange) {
      const [fromStatus, toStatus] = statusChange;
      const normalizedFrom = normalizeStatus(
        typeof fromStatus === "string" ? fromStatus : undefined,
      );
      const normalizedTo = normalizeStatus(
        typeof toStatus === "string" ? toStatus : undefined,
      );

      if (normalizedFrom !== normalizedTo) {
        if (TERMINAL_CANCELLED.has(normalizedFrom)) {
          anomalies.push(
            buildAnomaly(
              `terminal-reversion-cancelled-${entry.id}`,
              "HIGH",
              "audit.anomaly.reversion.cancelled.title",
              "audit.anomaly.reversion.cancelled.description",
            ),
          );
        } else if (TERMINAL_COMPLETED.has(normalizedFrom)) {
          anomalies.push(
            buildAnomaly(
              `terminal-reversion-completed-${entry.id}`,
              "HIGH",
              "audit.anomaly.reversion.completed.title",
              "audit.anomaly.reversion.completed.description",
            ),
          );
        }
      }
    }

    const scheduledChange = toChangeTuple(entry.changes.scheduled_at);
    const entryDate = entry.createdAt ? new Date(entry.createdAt) : now;

    if (scheduledChange && isScheduledPast(scheduledChange[1], entryDate)) {
      anomalies.push(
        buildAnomaly(
          `scheduled-in-past-${entry.id}`,
          "HIGH",
          "audit.anomaly.reversion.scheduled_past.title",
          "audit.anomaly.reversion.scheduled_past.description",
          {
            date: formatOperationalDateTime(
              typeof scheduledChange[1] === "string" ? scheduledChange[1] : null,
              options.timeZone,
            ),
          },
        ),
      );
    }
  }

  return anomalies;
}

function compareSeverity(left: OrderAnomalySeverity, right: OrderAnomalySeverity) {
  const order: OrderAnomalySeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "INFO"];
  return order.indexOf(left) - order.indexOf(right);
}

export function detectOrderAnomalies(
  order: Order,
  options: OrderAnomalyOptions = {},
) {
  const resolvedOptions: Required<OrderAnomalyOptions> = {
    now: options.now ?? new Date(),
    timeZone: options.timeZone ?? "Europe/Lisbon",
  };

  const anomalies = [
    ...detectStateConflicts(order),
    ...detectCriticalReversions(order, resolvedOptions),
    ...detectMissingFields(order),
  ];

  return anomalies.sort((left, right) => {
    const severityDiff = compareSeverity(left.severity, right.severity);

    if (severityDiff !== 0) {
      return severityDiff;
    }

    return left.title.localeCompare(right.title, "pt-PT");
  });
}

export function safeDetectOrderAnomalies(
  order: Order,
  options: OrderAnomalyOptions = {},
) {
  try {
    return {
      anomalies: detectOrderAnomalies(order, options),
      error: null,
    };
  } catch (error) {
    return {
      anomalies: [] as OrderAnomaly[],
      error:
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : translate("audit.anomaly.error.invalid_history"),
    };
  }
}
