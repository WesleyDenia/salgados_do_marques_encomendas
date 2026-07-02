import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOrderPrintAttemptId,
  buildOrderPrintHref,
  isOrderPrintFlowEvent,
  openPrintPreviewWindow,
  toThermalPrintOrder,
} from "@/lib/printing";
import type { Order } from "@/features/orders/types";

const baseOrder: Order = {
  id: 321,
  status: "accepted",
  paymentStatus: "partial",
  slot: "tarde",
  customerName: "Maria Operacional",
  customerContact: null,
  scheduledAt: "2026-05-20T13:00:00Z",
  total: 48,
  notes: "  ",
  items: [
    {
      id: 1,
      productId: 10,
      productName: "Rissol",
      quantity: 6,
      total: 18,
      flavorNames: ["Carne", "Frango"],
    },
    {
      id: 2,
      productId: 11,
      productName: "Croquete",
      quantity: 10,
      total: 30,
      flavorIds: [3, 9],
    },
  ],
  store: {
    id: 7,
    name: "Loja Norte",
    address: "Rua das Flores 12",
    city: "Porto",
    phone: "222333444",
  },
  createdAt: "2026-05-19T08:15:00Z",
};

test("toThermalPrintOrder reuses normalized order data and applies operational fallbacks", () => {
  const printable = toThermalPrintOrder(baseOrder, {
    statusLabels: { accepted: "Aceite" },
    timeZone: "Europe/Lisbon",
  });

  assert.equal(printable.idLabel, "Encomenda #321 ·");
  assert.equal(printable.statusLabel, "Aceite");
  assert.equal(printable.contactLabel, "Sem contacto registado");
  assert.equal(printable.notesLabel, "Sem notas operacionais");
  assert.equal(printable.paymentLabel, "PARCIAL");
  assert.deepEqual(printable.items[0].flavorLines, ["Carne", "Frango"]);
  assert.deepEqual(printable.items[1].flavorLines, ["#3", "#9"]);
});

test("toThermalPrintOrder expands repeated single-flavor pack selections for thermal printing", () => {
  const printable = toThermalPrintOrder({
    ...baseOrder,
    items: [
      {
        id: 99,
        productId: 99,
        productName: "Pack",
        quantity: 100,
        variantName: "Pack 100 Unidades",
        flavorNames: ["Pack Mix"],
      },
    ],
  });

  assert.deepEqual(printable.items[0].flavorLines, [
    "Pack Mix",
    "Pack Mix",
    "Pack Mix",
    "Pack Mix",
  ]);
});

test("toThermalPrintOrder appends partial withdrawal observations to the thermal notes", () => {
  const printable = toThermalPrintOrder({
    ...baseOrder,
    notes: "Cliente pediu confirmação",
    items: [
      {
        id: 99,
        productId: 99,
        productName: "Pack 100",
        quantity: 1,
        total: 60,
        originalUnits: 100,
        remainingUnits: 75,
        canWithdrawPartially: true,
      },
    ],
    partialWithdrawals: [
      {
        id: 8,
        requestedUnits: 25,
        flavorNames: ["Frango"],
        scheduledAt: "2026-05-20T17:00:00.000Z",
        status: "planned",
      },
    ],
  });

  assert.match(printable.notesLabel, /Cliente pediu confirmação/);
  assert.match(printable.notesLabel, /Retiradas parciais:/);
  assert.match(printable.notesLabel, /Saldo restante: 75 unid\./);
  assert.match(printable.notesLabel, /Retirada: 25 unid\./);
  assert.match(printable.notesLabel, /Frango/);
});

test("buildOrderPrintHref encodes ids for the dedicated print route", () => {
  assert.equal(buildOrderPrintHref(123), "/orders/123/print");
  assert.equal(buildOrderPrintHref("abc/45"), "/orders/abc%2F45/print");
  assert.equal(
    buildOrderPrintHref(123, { attemptId: "attempt-1", intent: "reprint" }),
    "/orders/123/print?attemptId=attempt-1&intent=reprint",
  );
});

test("openPrintPreviewWindow delegates to the provided browser opener", () => {
  const calls: Array<[string, string, string]> = [];
  const result = openPrintPreviewWindow("/orders/321/print", (...args) => {
    calls.push(args);
    return { closed: false } as Window;
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], ["/orders/321/print", "_blank", "noopener,noreferrer"]);
  assert.equal(result?.closed, false);
});

test("buildOrderPrintAttemptId creates an order-scoped ephemeral id", () => {
  const attemptId = buildOrderPrintAttemptId(321);

  assert.match(attemptId, /^order-321-/);
});

test("isOrderPrintFlowEvent accepts only the supported print handshake payload", () => {
  assert.equal(
    isOrderPrintFlowEvent({
      type: "order-print-flow",
      orderId: "321",
      attemptId: "order-321-1",
      intent: "reprint",
      state: "success",
      errorMessage: null,
    }),
    true,
  );
  assert.equal(
    isOrderPrintFlowEvent({
      type: "order-print-flow",
      orderId: "321",
      attemptId: "order-321-1",
      intent: "reprint",
      state: "ready",
    }),
    false,
  );
});
