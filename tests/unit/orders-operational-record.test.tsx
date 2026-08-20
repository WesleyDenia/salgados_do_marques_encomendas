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

  assert.match(markup, /Maria Silva/);
  assert.match(markup, /Loja Centro/);
  assert.match(markup, /Realizado/);
  assert.match(markup, />12</);
  assert.match(markup, /Pendente/);
  assert.match(markup, /Manhã/);
  assert.match(markup, /20\/05\/2026, 10:30/);
  assert.match(markup, /Página 1 de 3/);
  assert.match(markup, /Total de registros: 41/);
  assert.match(markup, /Abrir/);
  assert.doesNotMatch(markup, /Leitura operacional da fila/);
  assert.doesNotMatch(markup, /Sem picante/);

  assert.ok(
    markup.indexOf("Total de registros: 41") < markup.indexOf("Fila detalhada"),
  );
  assert.ok(markup.indexOf("Página 1 de 3") > markup.indexOf("Abrir"));
});

test("OrdersOperationalRecordContent marks withdrawal action only for eligible parent orders", () => {
  const markup = renderToStaticMarkup(
    <OrdersOperationalRecordContent
      orders={[
        {
          id: 42,
          status: "placed",
          paymentStatus: "pending",
          slot: "manha",
          customerName: "Maria Silva",
          scheduledAt: "2026-05-20T09:30:00+00:00",
          total: 24,
          store: {
            id: 3,
            name: "Loja Centro",
          },
          items: [
            {
              id: 1,
              productId: 12,
              productName: "Pack 100",
              quantity: 1,
              total: 24,
              canWithdrawPartially: true,
              remainingUnits: 75,
            },
          ],
          createdAt: "2026-05-12T09:30:00+00:00",
        },
        {
          id: 43,
          parentOrderId: 42,
          status: "placed",
          paymentStatus: "pending",
          slot: "manha",
          customerName: "Filha",
          scheduledAt: "2026-05-20T09:30:00+00:00",
          total: 12,
          store: {
            id: 3,
            name: "Loja Centro",
          },
          items: [
            {
              id: 2,
              parentOrderItemId: 1,
              productId: 12,
              productName: "Pack 25",
              quantity: 1,
              total: 12,
              canWithdrawPartially: true,
              remainingUnits: 25,
            },
          ],
          createdAt: "2026-05-12T09:30:00+00:00",
        },
      ]}
      meta={{ current_page: 1, last_page: 1, total: 2 }}
      timeZone="Europe/Lisbon"
      onOpenWithdrawal={() => {}}
    />,
  );

  assert.equal((markup.match(/Abrir ações da encomenda/g) ?? []).length, 2);
  assert.equal((markup.match(/inclui retirada/g) ?? []).length, 1);
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

  assert.match(markup, /Fila detalhada/);
  assert.doesNotMatch(markup, /Leitura operacional da fila/);
  assert.doesNotMatch(markup, /Investigação de encomendas/);
  assert.doesNotMatch(markup, /universo pesquisável/i);
});

test("OrdersOperationalRecordContent renders full operational cards in blocks mode", () => {
  const markup = renderToStaticMarkup(
    <OrdersOperationalRecordContent
      viewMode="cards"
      orders={[
        {
          id: 36,
          status: "placed",
          paymentStatus: "pending",
          slot: "tarde",
          customerName: "WESLEY SILVA",
          customerContact: "911928481",
          scheduledAt: "2026-06-13T16:00:00+00:00",
          total: 30,
          notes: "",
          partialWithdrawals: [
            {
              id: 77,
              requestedUnits: 25,
              flavorNames: ["Frango"],
              status: "planned",
              scheduledAt: "2026-06-13T16:00:00+00:00",
            },
          ],
          store: {
            id: 3,
            name: "Loja Centro",
          },
          user: null,
          items: [
            {
              id: 1,
              productId: 12,
              productName: "Mini salgados",
              quantity: 1,
              total: 30,
              variantName: "Pack 100 Unidades",
              flavorNames: [
                "Pack Mix",
                "Pack Mix",
                "Coxinha de Frango",
                "Coxinha de Frango",
              ],
            },
          ],
          createdAt: "2026-05-12T09:30:00+00:00",
        },
      ]}
      meta={{ current_page: 1, last_page: 1, total: 1 }}
      statusLabels={{ placed: "Realizado" }}
      timeZone="Europe/Lisbon"
    />,
  );

  assert.match(markup, /Encomenda #36/);
  assert.match(markup, /md:grid-cols-2 lg:grid-cols-3/);
  assert.match(markup, /Nome:<\/span> WESLEY SILVA/);
  assert.match(markup, /Tel:<\/span> 911 928 481/);
  assert.match(markup, /13\/06\/2026 às 17:00/);
  assert.match(markup, /Pack 100 Unidades/);
  assert.match(markup, /\* Pack Mix/);
  assert.match(markup, /\* Coxinha de Frango/);
  assert.match(markup, /Retirada parcial registada/);
  assert.match(markup, /25 unidades em 1 agendamento/);
  assert.match(markup, /Valor:<\/span> 30,00/);
  assert.match(markup, /Sem notas operacionais persistidas/);
});

test("OrderDetailSheet enables edit button when canEdit is true", () => {
  const markup = renderToStaticMarkup(
    <OrderDetailSheet
      open={true}
      onOpenChange={() => {}}
      onEditOrder={() => {}}
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
      onEditOrder={() => {}}
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
      onEditOrder={() => {}}
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
