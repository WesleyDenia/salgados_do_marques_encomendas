import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  OrderHistoryList,
  formatHistoryRelativeTime,
  formatOrderChange,
} from "@/features/orders/components/order-history-list";
import { normalizeOrderResource } from "@/features/orders/api";

test("OrderHistoryList renders readable history entries with user attribution and critical triage", () => {
  const markup = renderToStaticMarkup(
    <OrderHistoryList
      timeZone="Europe/Lisbon"
      statusLabels={{ pending: "Pendente", paid: "Pago", canceled: "Cancelada" }}
      history={[
        {
          id: 2,
          user: null,
          action: "cancelled",
          changes: { status: ["paid", "canceled"] },
          createdAt: "2026-06-10T15:20:00Z",
        },
        {
          id: 1,
          user: { id: 7, name: "Ana Costa", email: "ana@example.test" },
          action: "payment_updated",
          changes: { payment_status: ["pending", "paid"] },
          createdAt: "2026-06-10T14:00:00Z",
        },
      ]}
    />,
  );

  assert.match(markup, /Histórico de Alterações/);
  assert.match(markup, /Cancelamento/);
  assert.match(markup, /Sistema/);
  assert.match(markup, /Estado: Pago[^<]*→[^<]*Cancelada/);
  assert.match(markup, /Pagamento atualizado/);
  assert.match(markup, /Ana Costa/);
  assert.match(markup, /Estado do pagamento: Pendente[^<]*→[^<]*Pago/);
  assert.match(markup, /data-critical="true"/);
});

test("OrderHistoryList communicates absence of relevant history clearly", () => {
  const markup = renderToStaticMarkup(<OrderHistoryList history={[]} />);

  assert.match(markup, /Sem alterações relevantes registadas/);
  assert.doesNotMatch(markup, /dados em falta/i);
});

test("formatOrderChange handles nulls and complex payloads without leaking raw objects", () => {
  assert.equal(formatOrderChange("notes", [null, "Nova nota"]), "Notas: (vazio) → Nova nota");
  assert.equal(formatOrderChange("items", [{ id: 1 }, { id: 2 }]), "Itens alterados");
  assert.equal(formatOrderChange("store_id", [1, 2], { storeNamesById: { 1: "Centro", 2: "Norte" } }), "Loja: Centro → Norte");
  assert.equal(formatOrderChange("store_id", [{ id: 1, name: "Centro" }, { id: 2, name: "Norte" }]), "Loja: Centro → Norte");
  assert.equal(formatOrderChange("scheduled_at", ["2026-06-10T08:00:00Z", "2026-06-10T09:00:00Z"], { timeZone: "America/New_York" }), "Agendamento: 10/06/2026, 04:00 → 10/06/2026, 05:00");
});

test("OrderHistoryList keeps valid history chronologically sorted when one date is invalid", () => {
  const markup = renderToStaticMarkup(
    <OrderHistoryList
      history={[
        {
          id: "invalid",
          user: null,
          action: "payment_updated",
          changes: { payment_status: ["pending", "paid"] },
          createdAt: "not-a-date",
        },
        {
          id: "newer",
          user: null,
          action: "cancelled",
          changes: { status: ["paid", "canceled"] },
          createdAt: "2026-06-10T15:20:00Z",
        },
        {
          id: "older",
          user: null,
          action: "order_corrected",
          changes: { notes: [null, "Nota"] },
          createdAt: "2026-06-10T14:00:00Z",
        },
      ]}
    />,
  );

  assert.ok(markup.indexOf("Cancelamento") < markup.indexOf("Correção da encomenda"));
  assert.ok(markup.indexOf("Correção da encomenda") < markup.indexOf("Pagamento atualizado"));
});

test("normalizeOrderResource degrades malformed history payloads to an empty list", () => {
  const order = normalizeOrderResource({
    id: 1,
    status: "placed",
    history: {} as never,
  });

  assert.deepEqual(order.history, []);
});

test("formatHistoryRelativeTime falls back to absolute formatting for non-current operational days", () => {
  assert.equal(
    formatHistoryRelativeTime(
      "2026-06-10T23:30:00Z",
      "America/New_York",
      new Date("2026-06-11T12:00:00Z"),
    ),
    "10/06/2026, 19:30",
  );
});

test("OrderDetailSheet includes history in investigation mode as read-only context", async () => {
  const { OrderDetailSheet } = await import("@/features/orders/components/orders-operational-record");

  const markup = renderToStaticMarkup(
    <OrderDetailSheet
      open={true}
      onOpenChange={() => {}}
      mode="investigation"
      order={{
        id: 555,
        status: "paid",
        items: [],
        history: [
          {
            id: 1,
            user: null,
            action: "order_corrected",
            changes: { notes: [null, "Confirmar morada"] },
            createdAt: "2026-06-10T12:00:00Z",
          },
        ],
      }}
    />,
  );

  assert.match(markup, /Histórico de Alterações/);
  assert.match(markup, /Correção da encomenda/);
  assert.match(markup, /Notas: \(vazio\)[^<]*→[^<]*Confirmar morada/);
  assert.doesNotMatch(markup, /Corrigir encomenda/);
});
