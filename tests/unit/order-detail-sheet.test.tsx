import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  OrderDetailSheet,
  getAllowedOrderStatusTransitions,
} from "@/features/orders/components/orders-operational-record";

test("OrderDetailSheet renders all required sections following AC 2 hierarchy", () => {
  const markup = renderToStaticMarkup(
    <OrderDetailSheet
      open={true}
      onOpenChange={() => {}}
      onEditOrder={() => {}}
      statusLabels={{ pending: "Pendente" }}
      timeZone="Europe/Lisbon"
      order={{
        id: 123,
        status: "pending",
        canEdit: true,
        paymentStatus: "paid",
        slot: "manha",
        customerName: "João Silva",
        customerContact: "912345678",
        scheduledAt: "2026-05-20T10:00:00Z",
        total: 25.50,
        notes: "Entregar na porta lateral.",
        items: [
          {
            id: 1,
            productId: 10,
            productName: "Salgado Grande",
            quantity: 10,
            total: 20.00,
            flavorIds: [1, 2]
          }
        ],
        store: { id: 1, name: "Loja Central" },
        createdAt: "2026-05-18T09:00:00Z"
      }}
    />,
  );

  // Header (AC 2.1)
  assert.match(markup, /Encomenda #123/);
  assert.match(markup, /Pendente/);

  // Secção Cliente (AC 2.2)
  assert.match(markup, /João Silva/);
  assert.match(markup, /912345678/);

  // Secção Logística (AC 2.3)
  assert.match(markup, /Loja Central/);
  assert.match(markup, /Manhã/);

  // Tabela de Itens (AC 2.4)
  assert.match(markup, /Salgado Grande/);
  assert.match(markup, />10</);
  assert.match(markup, /20,00/);
  assert.match(markup, /Sabores: #1, #2/);

  // Secção Financeira (AC 2.5)
  assert.match(markup, /25,50/);
  assert.match(markup, /Pagamento: Pago/);

  // Secção Notas (AC 2.6)
  assert.match(markup, /Entregar na porta lateral/);

  // Footer (AC 2.7)
  assert.match(markup, /Corrigir encomenda/);
  assert.match(markup, /Criada em 18\/05\/2026/);
});

test("OrderDetailSheet handles empty states for sections", () => {
  const markup = renderToStaticMarkup(
    <OrderDetailSheet
      open={true}
      onOpenChange={() => {}}
      order={{
        id: 124,
        status: "pending",
        canEdit: true,
        items: [],
        notes: null,
        customerContact: null,
      }}
    />,
  );

  assert.match(markup, /Sem contacto registado/);
  assert.match(markup, /Sem notas operacionais/);
  assert.match(markup, /Reimprimir 80mm/);
  assert.match(markup, /Abra uma vista térmica dedicada para reimprimir/);
});

test("OrderDetailSheet hides the withdrawal action for derived orders", () => {
  const markup = renderToStaticMarkup(
    <OrderDetailSheet
      open={true}
      onOpenChange={() => {}}
      onOpenWithdrawal={() => {}}
      order={{
        id: 126,
        parentOrderId: 55,
        parentOrder: { id: 55, status: "accepted" },
        status: "placed",
        canEdit: true,
        items: [],
      }}
    />,
  );

  assert.match(markup, /Encomenda derivada/);
  assert.doesNotMatch(markup, /Retirada<\/button>/);
});

test("OrderDetailSheet shows the withdrawal action for eligible parent orders", () => {
  const markup = renderToStaticMarkup(
    <OrderDetailSheet
      open={true}
      onOpenChange={() => {}}
      onOpenWithdrawal={() => {}}
      order={{
        id: 127,
        status: "accepted",
        canEdit: true,
        items: [
          {
            id: 11,
            productId: 8,
            productName: "Mini Salgados",
            quantity: 1,
            total: 35,
            canWithdrawPartially: true,
            remainingUnits: 75,
            originalUnits: 100,
          },
        ],
      }}
    />,
  );

  assert.match(markup, /Retiradas parciais/);
  assert.match(markup, /Retirada<\/button>/);
});

test("OrderDetailSheet shows warning and disables button when canEdit is false", () => {
  const markup = renderToStaticMarkup(
    <OrderDetailSheet
      open={true}
      onOpenChange={() => {}}
      onEditOrder={() => {}}
      order={{
        id: 125,
        status: "ready",
        canEdit: false,
        items: [],
      }}
    />,
  );

  assert.match(markup, /Esta encomenda já não permite correções/);
  const disabledButton = markup.match(/<button[^>]*disabled[^>]*>Corrigir encomenda<\/button>/i);
  assert.ok(disabledButton, "Button should be disabled");
});

test("getAllowedOrderStatusTransitions returns only the UI actions allowed by the current status", () => {
  assert.deepEqual(getAllowedOrderStatusTransitions("placed"), [
    "accepted",
    "rejected",
    "canceled",
  ]);
  assert.deepEqual(getAllowedOrderStatusTransitions("accepted"), [
    "ready",
    "canceled",
  ]);
  assert.deepEqual(getAllowedOrderStatusTransitions("ready"), ["done"]);
  assert.deepEqual(getAllowedOrderStatusTransitions("rejected"), []);
  assert.deepEqual(getAllowedOrderStatusTransitions("canceled"), []);
  assert.deepEqual(getAllowedOrderStatusTransitions("done"), []);
});

test("OrderDetailSheet renders only valid status transition actions", () => {
  const markup = renderToStaticMarkup(
    <OrderDetailSheet
      open={true}
      onOpenChange={() => {}}
      statusLabels={{
        placed: "Realizada",
        accepted: "Aceite",
        rejected: "Rejeitada",
        canceled: "Cancelada",
      }}
      order={{
        id: 201,
        status: "placed",
        canEdit: true,
        items: [],
      }}
    />,
  );

  assert.match(markup, /Atualizar estado/);
  assert.match(markup, /Aceite/);
  assert.match(markup, /Rejeitada/);
  assert.match(markup, /Cancelada/);
  assert.doesNotMatch(markup, /done/i);
});

test("OrderDetailSheet hides transition actions for terminal statuses", () => {
  for (const status of ["rejected", "canceled", "done"] as const) {
    const markup = renderToStaticMarkup(
      <OrderDetailSheet
        open={true}
        onOpenChange={() => {}}
        statusLabels={{
          rejected: "Rejeitada",
          canceled: "Cancelada",
          done: "Concluída",
        }}
        order={{
          id: 202,
          status,
          canEdit: false,
          items: [],
        }}
      />,
    );

    assert.doesNotMatch(markup, /Atualizar estado/);
  }
});

test("OrderDetailSheet renders audit context only in investigation mode and keeps it read-only", () => {
  const order = {
    id: 205,
    status: "done",
    canEdit: true,
    paymentStatus: "pending" as const,
    slot: "manha" as const,
    scheduledAt: "2026-06-10T10:00:00Z",
    items: [
      {
        id: 1,
        productId: 9,
        productName: "Kibe",
        quantity: 1,
        total: 3.5,
      },
    ],
    store: { id: 1, name: "Loja Centro" },
    history: [
      {
        id: 1,
        user: { id: 9, name: "Supervisor", email: "sup@example.test" },
        action: "status_changed",
        changes: { status: { from: "placed", to: "accepted" } },
        createdAt: "2026-06-10T09:30:00Z",
      },
    ],
  };

  const investigationMarkup = renderToStaticMarkup(
    <OrderDetailSheet
      mode="investigation"
      open={true}
      onOpenChange={() => {}}
      order={order}
      statusLabels={{ placed: "Realizada", accepted: "Aceite" }}
    />,
  );

  const operationalMarkup = renderToStaticMarkup(
    <OrderDetailSheet
      mode="operational"
      open={true}
      onOpenChange={() => {}}
      order={order}
      statusLabels={{ placed: "Realizada", accepted: "Aceite" }}
    />,
  );

  assert.match(investigationMarkup, /Contexto de Auditoria/);
  assert.match(investigationMarkup, /Alertas de Diagnóstico/);
  assert.match(investigationMarkup, /Concluída com pagamento pendente/i);
  assert.match(investigationMarkup, /CRITICAL/);
  assert.match(investigationMarkup, /Apenas leitura/);
  assert.match(investigationMarkup, /Histórico de Alterações/);
  assert.doesNotMatch(investigationMarkup, /Corrigir encomenda|Editar|Resolver/);
  assert.doesNotMatch(operationalMarkup, /Contexto de Auditoria/);
});

test("OrderDetailSheet keeps status actions available even when data corrections are blocked", () => {
  const markup = renderToStaticMarkup(
    <OrderDetailSheet
      open={true}
      onOpenChange={() => {}}
      statusLabels={{
        accepted: "Aceite",
        rejected: "Rejeitada",
        canceled: "Cancelada",
      }}
      order={{
        id: 204,
        status: "placed",
        canEdit: false,
        items: [],
      }}
    />,
  );

  assert.match(markup, /Atualizar estado/);
  assert.match(markup, /Aceite/);
  assert.match(markup, /Rejeitada/);
  assert.match(markup, /Cancelada/);
  assert.match(markup, /Esta encomenda já não permite correções/);
});

test("OrderDetailSheet disables status actions and shows pending feedback while updating", () => {
  const markup = renderToStaticMarkup(
    <OrderDetailSheet
      open={true}
      onOpenChange={() => {}}
      isUpdatingStatus={true}
      statusLabels={{
        accepted: "Aceite",
        rejected: "Rejeitada",
        canceled: "Cancelada",
      }}
      order={{
        id: 203,
        status: "placed",
        canEdit: true,
        items: [],
      }}
    />,
  );

  assert.match(markup, /A atualizar estado operacional/);
  const disabledButtons = markup.match(/<button[^>]*disabled=""/g) ?? [];
  assert.ok(disabledButtons.length >= 3, "As ações de transição devem ficar desativadas");
});

test("OrderDetailSheet shows print CTA feedback states and prefers flavor names over ids", () => {
  const markup = renderToStaticMarkup(
    <OrderDetailSheet
      open={true}
      onOpenChange={() => {}}
      printState="error"
      printErrorMessage="O browser bloqueou a janela."
      order={{
        id: 300,
        status: "accepted",
        canEdit: true,
        items: [
          {
            id: 1,
            productId: 22,
            productName: "Rissol",
            quantity: 4,
            total: 8,
            variantName: "Mini",
            flavorIds: [1, 2],
            flavorNames: ["Carne", "Legumes"],
          },
        ],
      }}
    />,
  );

  assert.match(markup, /Reimpressão operacional/);
  assert.match(markup, /O browser bloqueou a janela/);
  assert.match(markup, /Tentar novamente/);
  assert.match(markup, /Sabores: Carne, Legumes/);
  assert.match(markup, /Variação: Mini/);
  assert.doesNotMatch(markup, /Sabores: #1, #2/);
});

test("OrderDetailSheet renders explicit success feedback after the print attempt is triggered", () => {
  const markup = renderToStaticMarkup(
    <OrderDetailSheet
      open={true}
      onOpenChange={() => {}}
      printState="success"
      order={{
        id: 301,
        status: "accepted",
        canEdit: true,
        items: [],
      }}
    />,
  );

  assert.match(markup, /tentativa de reimpressão terminou/i);
  assert.match(markup, /Reimprimir 80mm/);
});

test("OrderDetailSheet distinguishes an opened preview from the browser print dialog", () => {
  const markup = renderToStaticMarkup(
    <OrderDetailSheet
      open={true}
      onOpenChange={() => {}}
      printState="preview"
      order={{
        id: 302,
        status: "accepted",
        canEdit: true,
        items: [],
      }}
    />,
  );

  assert.match(markup, /Vista térmica de reimpressão aberta/);
  assert.match(markup, /Reimprimir 80mm/);
});
