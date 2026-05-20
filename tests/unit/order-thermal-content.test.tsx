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
    slot: "manha",
    customerName: "Joana Silva",
    customerContact: "912000111",
    scheduledAt: "2026-05-20T08:30:00Z",
    total: 60,
    notes: "Sem cebola\nSeparar para balcão.",
    items: [
      {
        id: 1,
        productId: 3,
        productName: "Empada",
        quantity: 12,
        total: 36,
        variantName: "Grande",
        flavorNames: ["Frango"],
      },
      {
        id: 2,
        productId: 4,
        productName: "Coxinha",
        quantity: 8,
        total: 24,
      },
    ],
    store: {
      id: 9,
      name: "Loja Centro",
      address: "Rua Central 1",
      city: "Lisboa",
      phone: "213000000",
    },
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
  assert.match(markup, /Encomenda #555/);
  assert.match(markup, /Pronta/);
  assert.match(markup, /Joana Silva/);
  assert.match(markup, /912000111/);
  assert.match(markup, /Loja Centro/);
  assert.match(markup, /Rua Central 1, Lisboa/);
  assert.match(markup, /213000000/);
  assert.match(markup, /Manhã/);
  assert.match(markup, /Empada/);
  assert.match(markup, /Variação: Grande/);
  assert.match(markup, /Sabores: Frango/);
  assert.match(markup, /Sem cebola/);
  assert.match(markup, /Separar para balcão/);
  assert.match(markup, /60,00/);
  assert.match(markup, /Pago/);
});
