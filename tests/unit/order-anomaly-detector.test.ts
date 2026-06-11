import assert from "node:assert/strict";
import test from "node:test";

import {
  detectOrderAnomalies,
  safeDetectOrderAnomalies,
} from "@/features/orders/utils/order-anomaly-detector";
import type { Order } from "@/features/orders/types";

function buildOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 904,
    status: "accepted",
    paymentStatus: "paid",
    slot: "manha",
    customerName: "Cliente Teste",
    customerContact: "912345678",
    scheduledAt: "2026-06-11T11:30:00Z",
    items: [
      {
        id: 1,
        productId: 21,
        productName: "Coxinha",
        quantity: 2,
        total: 10,
      },
    ],
    total: 10,
    store: { id: 7, name: "Loja Centro" },
    history: [],
    createdAt: "2026-06-10T09:00:00Z",
    ...overrides,
  };
}

test("detectOrderAnomalies valida campos essenciais, conflitos críticos e reversões terminais", () => {
  const anomalies = detectOrderAnomalies(
    buildOrder({
      status: "done",
      paymentStatus: "pending" as never,
      customerContact: null,
      items: [],
      history: [
        {
          id: 1,
          user: null,
          action: "updated",
          changes: {
            status: { from: "canceled", to: "accepted" },
            scheduled_at: {
              from: "2026-06-12T10:00:00Z",
              to: "2026-06-10T08:00:00Z",
            },
          },
          createdAt: "2026-06-11T10:00:00Z",
        },
      ],
    }),
    {
      now: "2026-06-11T12:00:00Z",
      timeZone: "Europe/Lisbon",
    },
  );

  assert.ok(anomalies.length >= 4);
  assert.match(anomalies[0]?.title ?? "", /concluída com pagamento pendente/i);
  assert.ok(
    anomalies.some(
      (item) =>
        item.code.startsWith("terminal-reversion-cancelled") &&
        item.severity === "HIGH",
    ),
  );
  assert.ok(
    anomalies.some(
      (item) =>
        item.code.startsWith("scheduled-in-past") &&
        item.severity === "HIGH" &&
        /05 minutos|5 minutos/i.test(item.description),
    ),
  );
  assert.ok(
    anomalies.some(
      (item) =>
        item.code === "missing-customer-contact" &&
        item.severity === "MEDIUM" &&
        /Contacto \(\*\*\*(678)?\) em falta/i.test(item.title),
    ),
  );
});

test("detectOrderAnomalies respeita a tolerância de 5 minutos para das alteradas para o passado", () => {
  const anomalies = detectOrderAnomalies(
    buildOrder({
      history: [
        {
          id: 2,
          user: null,
          action: "updated",
          changes: {
            scheduled_at: {
              from: "2026-06-11T13:00:00Z",
              to: "2026-06-11T11:56:00Z",
            },
          },
          createdAt: "2026-06-11T11:57:00Z",
        },
      ],
    }),
    {
      now: "2026-06-11T12:00:00Z",
      timeZone: "Europe/Lisbon",
    },
  );

  assert.equal(
    anomalies.some((item) => item.code.startsWith("scheduled-in-past")),
    false,
  );
});

test("detectOrderAnomalies não gera falso positivo para alterações antigas que agora estão no passado", () => {
  const anomalies = detectOrderAnomalies(
    buildOrder({
      history: [
        {
          id: 5,
          user: null,
          action: "updated",
          changes: {
            scheduled_at: {
              from: "2026-06-01T10:00:00Z",
              to: "2026-06-01T11:00:00Z",
            },
          },
          createdAt: "2026-06-01T09:00:00Z",
        },
      ],
    }),
    {
      now: "2026-06-11T12:00:00Z",
      timeZone: "Europe/Lisbon",
    },
  );

  assert.equal(
    anomalies.some((item) => item.code.startsWith("scheduled-in-past")),
    false,
  );
});

test("safeDetectOrderAnomalies devolve erro curto para histórico corrompido", () => {
  const result = safeDetectOrderAnomalies(
    buildOrder({
      history: "payload-invalido" as never,
    }),
    {
      now: "2026-06-11T12:00:00Z",
      timeZone: "Europe/Lisbon",
    },
  );

  assert.equal(result.anomalies.length, 0);
  assert.equal(result.error, "Estrutura do histórico inválida");
});

test("safeDetectOrderAnomalies lida com entradas nulas no histórico", () => {
  const result = safeDetectOrderAnomalies(
    buildOrder({
      history: [null] as never,
    }),
    {
      now: "2026-06-11T12:00:00Z",
      timeZone: "Europe/Lisbon",
    },
  );

  assert.equal(result.anomalies.length, 0);
  assert.equal(result.error, "Estrutura do histórico inválida");
});
