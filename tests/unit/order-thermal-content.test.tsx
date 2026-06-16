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
    customerName: "Joana Silva",
    customerContact: "912000111",
    scheduledAt: "2026-06-13T16:00:00Z",
    total: 60,
    notes: "Sem cebola\nSeparar para balcão.",
    items: [
      {
        id: 1,
        productId: 3,
        productName: "Pack",
        quantity: 100,
        total: 36,
        variantName: "Pack 100 Unidades",
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

  const markup = renderToStaticMarkup(
    <OrderThermalContent
      order={toThermalPrintOrder(order, {
        statusLabels: { ready: "Pronta" },
        timeZone: "Europe/Lisbon",
      })}
      state="printing"
      statusMessage="Diálogo de impressão aberto"
    />,
  );

  assert.match(markup, /Documento térmico 80mm/);
  assert.match(markup, /Encomenda #555 ·/);
  assert.match(markup, /Joana Silva/);
  assert.match(markup, /912 000 111/);
  assert.match(markup, /Sáb 13\/06\/2026 às 17:00/);
  assert.match(markup, /Pack 100 Unidades/);
  assert.match(markup, /Sabores:/);
  assert.match(markup, /- Pack Mix/);
  assert.match(markup, /- Coxinha de Frango/);
  assert.match(markup, /Sem cebola/);
  assert.match(markup, /Separar para balcão/);
  assert.match(markup, /60,00/);
  assert.match(markup, /PAGO/);
  assert.doesNotMatch(markup, /Data\/Hora/);
  assert.doesNotMatch(markup, /Loja Centro/);
  assert.doesNotMatch(markup, /Criada em/);
  assert.doesNotMatch(markup, /Documento térmico operacional 80mm/);
});
