import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  OrderAuditContext,
  buildOrderAuditSummary,
} from "@/features/orders/components/order-audit-context";
import type { Order } from "@/features/orders/types";

function buildBaseOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 501,
    status: "accepted",
    paymentStatus: "paid",
    slot: "manha",
    customerName: "Cliente Teste",
    customerContact: "912345678",
    scheduledAt: "2026-06-10T10:00:00Z",
    cancelledAt: null,
    items: [
      {
        id: 1,
        productId: 44,
        productName: "Empada",
        quantity: 1,
        total: 12,
      },
    ],
    total: 12,
    store: { id: 7, name: "Loja Centro" },
    history: [],
    createdAt: "2026-06-09T10:00:00Z",
    ...overrides,
  };
}

test("buildOrderAuditSummary classifies critical changes and matches current state deterministically", () => {
  const summary = buildOrderAuditSummary(
    buildBaseOrder({
      history: [
        {
          id: 1,
          user: { id: 3, name: "Ana Costa", email: "ana@example.test" },
          action: "status_changed",
          changes: {
            status: { from: "placed", to: "accepted" },
            customer_contact: { from: "919111222", to: "912345678" },
          },
          createdAt: "2026-06-10T08:30:00Z",
        },
      ],
    }),
    {
      statusLabels: {
        placed: "Realizada",
        accepted: "Aceite",
      },
      timeZone: "Europe/Lisbon",
    },
  );

  assert.equal(summary.criticalCount, 1);
  assert.equal(summary.signals[0]?.severity, "critical");
  assert.equal(summary.signals[0]?.actor, "Ana Costa");
  assert.match(summary.signals[0]?.currentStateRelation ?? "", /valor atual/i);
  assert.deepEqual(summary.flaggedFieldLabels, ["Estado", "Contacto"]);
  assert.match(
    summary.signals[0]?.changeLines.join(" | ") ?? "",
    /Contacto: \*+222 → \*+678/,
  );
});

test("buildOrderAuditSummary masks numeric contacts on informative events", () => {
  const summary = buildOrderAuditSummary(
    buildBaseOrder({
      history: [
        {
          id: 2,
          user: null,
          action: "updated",
          changes: {
            customer_contact: { from: 919111222, to: 912345678 },
            notes: { from: "Urgente", to: "Confirmado" },
          },
          createdAt: "2026-06-10T08:35:00Z",
        },
      ],
    }),
    {
      statusLabels: {
        placed: "Realizada",
        ready: "Pronta",
      },
      timeZone: "Europe/Lisbon",
    },
  );

  assert.equal(summary.signals[0]?.severity, "info");
  assert.match(
    summary.signals[0]?.changeLines.join(" | ") ?? "",
    /Contacto: \*+222 → \*+678/,
  );
  assert.match(summary.signals[0]?.currentStateRelation ?? "", /sem relação determinística/i);
});

test("buildOrderAuditSummary keeps non-matching deterministic changes neutral", () => {
  const summary = buildOrderAuditSummary(
    buildBaseOrder({
      history: [
        {
          id: 3,
          user: null,
          action: "status_changed",
          changes: {
            status: { from: "placed", to: "ready" },
          },
          createdAt: "2026-06-10T08:40:00Z",
        },
      ],
    }),
    {
      statusLabels: {
        placed: "Realizada",
        ready: "Pronta",
      },
      timeZone: "Europe/Lisbon",
    },
  );

  assert.match(
    summary.signals[0]?.currentStateRelation ?? "",
    /sem correspondência direta com o estado atual/i,
  );
});

test("OrderAuditContext masks sensitive values and avoids leaking raw technical payloads", () => {
  const markup = renderToStaticMarkup(
    <OrderAuditContext
      order={buildBaseOrder({
        history: [
          {
            id: 10,
            user: null,
            action: "external:token-refresh:abc123",
            changes: {
              email: { from: "cliente@example.test", to: "novo@example.test" },
              nif: { from: "123456789", to: "987654321" },
              token: { from: "secret", to: "token-2" },
              payload: { from: { raw: true }, to: { raw: false } },
            },
            createdAt: "2026-06-10T11:00:00Z",
          },
        ],
      })}
    />,
  );

  assert.match(markup, /Contexto de Auditoria/);
  assert.match(markup, /Sistema/);
  assert.match(markup, /valor sensível suprimido/i);
  assert.doesNotMatch(markup, /cliente@example\.test/);
  assert.doesNotMatch(markup, /123456789/);
  assert.doesNotMatch(markup, /abc123/);
  assert.doesNotMatch(markup, /external:token-refresh/);
});

test("OrderAuditContext communicates absence of auditable alerts without blocking the rest of the detail", () => {
  const markup = renderToStaticMarkup(
    <OrderAuditContext
      order={buildBaseOrder({
        history: [
          {
            id: 1,
            user: null,
            action: "created",
            changes: null,
            createdAt: "2026-06-09T10:00:00Z",
          },
        ],
      })}
    />,
  );

  assert.match(markup, /Sem alertas auditáveis relevantes/);
  assert.doesNotMatch(markup, /dados em falta/i);
});

test("OrderAuditContext tolerates invalid dates and corrupted changes payloads", () => {
  const markup = renderToStaticMarkup(
    <OrderAuditContext
      order={buildBaseOrder({
        history: [
          {
            id: 1,
            user: null,
            action: "updated",
            changes: null,
            createdAt: "not-a-date",
          },
        ],
      })}
    />,
  );

  assert.match(markup, /Data não registada|not-a-date/);
  assert.match(markup, /sem detalhe adicional legível/i);
});

test("OrderAuditContext mostra fallback técnico curto quando a análise encontra histórico inválido", () => {
  const markup = renderToStaticMarkup(
    <OrderAuditContext
      order={buildBaseOrder({
        history: "corrupted-payload" as never,
      })}
    />,
  );

  assert.match(markup, /Análise de integridade falhou: Estrutura do histórico inválida/);
});
