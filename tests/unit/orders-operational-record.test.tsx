import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  buildOrdersRecordUrl,
  OrderDetailSheet,
  OrdersOperationalRecordContent,
} from "@/features/orders/components/orders-operational-record";

test("OrdersOperationalRecordContent renders the persisted operational record", () => {
  const markup = renderToStaticMarkup(
    <OrdersOperationalRecordContent
      orders={[
        {
          id: 42,
          status: "placed",
          paymentStatus: "pending",
          slot: "manha",
          customerName: "Maria Silva",
          customerContact: "912345678",
          scheduledAt: "2026-05-20T09:30:00+00:00",
          total: 24,
          notes: "Sem picante",
          store: {
            id: 3,
            name: "Loja Centro",
          },
          user: null,
          items: [
            {
              id: 1,
              productId: 12,
              productName: "Coxinha",
              quantity: 12,
              total: 24,
            },
          ],
          createdAt: "2026-05-12T09:30:00+00:00",
        },
      ]}
      meta={{ current_page: 1, last_page: 3, total: 41 }}
      statusLabels={{ placed: "Realizado" }}
      timeZone="Europe/Lisbon"
    />,
  );

  assert.match(markup, /Leitura operacional da fila/);
  assert.match(markup, /Maria Silva/);
  assert.match(markup, /Loja Centro/);
  assert.match(markup, /Realizado/);
  assert.match(markup, />12</);
  assert.match(markup, /Pendente/);
  assert.match(markup, /Manhã/);
  assert.match(markup, /20\/05\/2026, 10:30/);
  assert.match(markup, /Sem picante/);
  assert.match(markup, /41 encomendas encontradas/);
  assert.match(markup, /Página 1 de 3/);
  assert.match(markup, /Abrir/);
});

test("OrdersOperationalRecordContent adapts copy for investigation mode", () => {
  const markup = renderToStaticMarkup(
    <OrdersOperationalRecordContent
      mode="investigation"
      orders={[
        {
          id: 42,
          status: "placed",
          paymentStatus: "pending",
          slot: "manha",
          customerName: "Maria Silva",
          customerContact: "912345678",
          scheduledAt: "2026-05-20T09:30:00+00:00",
          total: 24,
          notes: "Sem picante",
          store: {
            id: 3,
            name: "Loja Centro",
          },
          user: null,
          items: [],
          createdAt: "2026-05-12T09:30:00+00:00",
        },
      ]}
      meta={{ current_page: 1, last_page: 1, total: 1 }}
      statusLabels={{ placed: "Realizado" }}
      timeZone="Europe/Lisbon"
    />,
  );

  assert.match(markup, /Leitura operacional da fila/);
  assert.match(markup, /Fila detalhada/);
  assert.doesNotMatch(markup, /Investigação de encomendas/);
  assert.doesNotMatch(markup, /universo pesquisável/i);
});

test("OrderDetailSheet enables edit button when canEdit is true", () => {
  const markup = renderToStaticMarkup(
    <OrderDetailSheet
      open={true}
      onOpenChange={() => {}}
      statusLabels={{ placed: "Realizado" }}
      timeZone="Europe/Lisbon"
      order={{
        id: 42,
        status: "placed",
        canEdit: true,
        items: [],
      }}
    />,
  );

  assert.match(markup, /Corrigir encomenda/);
  assert.match(markup, /Realizado/);
  assert.ok(!markup.includes('disabled=""'));
});

test("OrderDetailSheet disables edit button and shows reason when canEdit is false", () => {
  const markup = renderToStaticMarkup(
    <OrderDetailSheet
      open={true}
      onOpenChange={() => {}}
      statusLabels={{ concluido: "Concluído" }}
      timeZone="Europe/Lisbon"
      order={{
        id: 42,
        status: "concluido",
        canEdit: false,
        items: [],
      }}
    />,
  );

  assert.match(markup, /Corrigir encomenda/);
  assert.match(markup, /disabled=""/);
  assert.match(markup, /Esta encomenda já não permite correções/);
  assert.match(markup, /Concluído/);
});

test("OrderDetailSheet does not block corrections when canEdit is still unknown", () => {
  const markup = renderToStaticMarkup(
    <OrderDetailSheet
      open={true}
      onOpenChange={() => {}}
      statusLabels={{ placed: "Realizado" }}
      timeZone="Europe/Lisbon"
      order={{
        id: 42,
        status: "placed",
        items: [],
      }}
    />,
  );

  assert.match(markup, /Corrigir encomenda/);
  assert.doesNotMatch(markup, /Esta encomenda já não permite correções/);
});

test("OrderDetailSheet hides operational actions in investigation mode", () => {
  const markup = renderToStaticMarkup(
    <OrderDetailSheet
      mode="investigation"
      open={true}
      onOpenChange={() => {}}
      onEditOrder={() => {}}
      onStatusChange={() => {}}
      onPrintOrder={() => {}}
      statusLabels={{ placed: "Realizado", accepted: "Aceite" }}
      timeZone="Europe/Lisbon"
      order={{
        id: 42,
        status: "placed",
        canEdit: true,
        items: [],
        createdAt: "2026-05-12T09:30:00+00:00",
      }}
    />,
  );

  assert.match(markup, /Detalhe da investigação/i);
  assert.match(markup, /Criada em 12\/05\/2026, 10:30/);
  assert.doesNotMatch(markup, /Corrigir encomenda/);
  assert.doesNotMatch(markup, /Atualizar estado/);
  assert.doesNotMatch(markup, /Reimpressão operacional/);
});

test("buildOrdersRecordUrl removes default or invalid investigation period params", () => {
  assert.equal(
    buildOrdersRecordUrl({
      pathname: "/audit/investigation",
      searchParams: new URLSearchParams("period=all"),
      normalizedSearch: "",
      effectivePage: 1,
      period: "all",
      defaultPeriod: "all",
      status: "",
      paymentStatus: "",
      slot: "",
    }),
    "/audit/investigation",
  );

  assert.equal(
    buildOrdersRecordUrl({
      pathname: "/audit/investigation",
      searchParams: new URLSearchParams("period=bogus"),
      normalizedSearch: "",
      effectivePage: 1,
      period: "all",
      defaultPeriod: "all",
      status: "",
      paymentStatus: "",
      slot: "",
    }),
    "/audit/investigation",
  );
});

test("buildOrdersRecordUrl removes invalid filters that normalize to investigation defaults", () => {
  assert.equal(
    buildOrdersRecordUrl({
      pathname: "/audit/investigation",
      searchParams: new URLSearchParams(
        "status=bogus&payment_status=x&slot=y&page=abc",
      ),
      normalizedSearch: "",
      effectivePage: 1,
      period: "all",
      defaultPeriod: "all",
      status: "",
      paymentStatus: "",
      slot: "",
    }),
    "/audit/investigation",
  );
});

test("buildOrdersRecordUrl keeps a canonical page param when only pagination changes", () => {
  assert.equal(
    buildOrdersRecordUrl({
      pathname: "/audit/investigation",
      searchParams: new URLSearchParams("page=1"),
      normalizedSearch: "",
      effectivePage: 3,
      period: "all",
      defaultPeriod: "all",
      status: "",
      paymentStatus: "",
      slot: "",
    }),
    "/audit/investigation?page=3",
  );
});

test("buildOrdersRecordUrl resets pagination when investigation filters change", () => {
  assert.equal(
    buildOrdersRecordUrl({
      pathname: "/audit/investigation",
      searchParams: new URLSearchParams("page=3&search=Maria"),
      normalizedSearch: "Ana",
      effectivePage: 1,
      period: "all",
      defaultPeriod: "all",
      status: "",
      paymentStatus: "",
      slot: "",
    }),
    "/audit/investigation?search=Ana",
  );
});
