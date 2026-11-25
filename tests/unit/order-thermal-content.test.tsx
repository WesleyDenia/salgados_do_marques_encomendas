import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { OrderThermalContent } from "@/features/printing/components/order-thermal-content";
import { toThermalPrintOrder } from "@/lib/printing";
import type { Order } from "@/features/orders/types";

test("OrderThermalContent renders the full operational document for 80mm printing", () => {
  const order: Order = {
    id: 555,
    status: "ready",
    paymentStatus: "paid",
    paidAmount: 60,
    customerName: "Joana Silva",
    customerContact: "912000111",
    scheduledAt: "2026-06-13T16:00:00Z",
    total: 60,
    notes: "Sem cebola\nSeparar para balcão.",
    store: {
      id: 1,
      name: "Loja Centro",
    },
    items: [
      {
        id: 1,
        productId: 3,
        productName: "Pack",
        quantity: 100,
        total: 36,
        variantName: "Pack 100 Unidades",
        isFrozen: true,
        flavorNames: ["Pack Mix", "Pack Mix", "Coxinha de Frango", "Coxinha de Frango"],
      },
      {
        id: 2,
        productId: 4,
        productName: "Coxinha",
        quantity: 8,
        total: 24,
      },
    ],
    createdAt: "2026-05-19T09:00:00Z",
  };

  const printableOrder = toThermalPrintOrder(order, {
    statusLabels: { ready: "Pronta" },
    timeZone: "Europe/Lisbon",
  });

  const markup = renderToStaticMarkup(
    <OrderThermalContent
      order={{
        ...printableOrder,
        fryingTiming: { startLabel: "15:41", finishLabel: "15:55", pickupLabel: "16:00" },
      }}
      state="printing"
      statusMessage="Diálogo de impressão aberto"
    />,
  );

  assert.match(markup, /Documento térmico 80mm/);
  assert.match(markup, /Encomenda #555 ·/);
  assert.match(markup, /JOANA SILVA/);
  assert.match(markup, /912 000 111/);
  assert.match(markup, /Sáb 13\/06\/2026 às 17:00/);
  assert.match(markup, /LOJA CENTRO/);
  assert.match(markup, /PACK 100 UNIDADES/);
  assert.match(markup, /Sabores:/);
  assert.match(markup, /- PACK MIX - CONGELADO/);
  assert.match(markup, /- COXINHA DE FRANGO - CONGELADO/);
  assert.match(markup, /Sem cebola/);
  assert.match(markup, /Separar para balcão/);
  assert.match(markup, /60,00/);
  assert.match(markup, /Valor pago/);
  assert.doesNotMatch(markup, /Falta pagar/);
  assert.match(markup, /Estado do pagamento/);
  assert.match(markup, /Pago/);
  assert.match(markup, /Planeamento de fritura/);
  assert.match(markup, /15:41/);
  assert.match(markup, /15:55/);
  assert.match(markup, /16:00/);
  assert.doesNotMatch(markup, /Data\/Hora/);
  assert.doesNotMatch(markup, /Criada em/);
  assert.doesNotMatch(markup, /Documento térmico operacional 80mm/);
});

test("OrderThermalContent omits payment and observations when the order has neither", () => {
  const order: Order = {
    id: 556,
    status: "accepted",
    paymentStatus: null,
    customerName: "Cliente sem notas",
    customerContact: null,
    scheduledAt: "2026-06-13T16:00:00Z",
    total: 20,
    notes: null,
    items: [{ id: 1, productId: 1, productName: "Pack", quantity: 1, total: 20 }],
    createdAt: "2026-05-19T09:00:00Z",
  };

  const markup = renderToStaticMarkup(
    <OrderThermalContent
      order={toThermalPrintOrder(order)}
      state="preview"
      statusMessage="Vista térmica pronta"
    />,
  );

  assert.doesNotMatch(markup, /Estado do pagamento/);
  assert.doesNotMatch(markup, /Sem notas operacionais/);
  assert.doesNotMatch(markup, />Obs</);
});
