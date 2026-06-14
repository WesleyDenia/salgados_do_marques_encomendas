import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ProtectedAreaPage } from "@/components/layout/protected-area-page";

test("ProtectedAreaPage renders an operational dashboard frame instead of technical access copy", () => {
  const markup = renderToStaticMarkup(
    <ProtectedAreaPage
      routeKey="dashboard"
      sessionUser={{
        id: 1,
        name: "Ana Operações",
        email: "ana@example.test",
        role: "operacional",
        active: true,
      }}
    >
      <div>Resumo operacional do dia</div>
    </ProtectedAreaPage>,
  );

  assert.match(markup, /Dashboard de encomendas/);
  assert.match(markup, /Resumo operacional do dia/);
  assert.match(markup, /criação, atendimento e planeamento/i);
  assert.doesNotMatch(markup, /Capacidades carregadas/);
  assert.doesNotMatch(markup, /Áreas fora do âmbito deste perfil/);
  assert.doesNotMatch(markup, /Destinos principais/);
  assert.doesNotMatch(markup, /Estrutura reservada para próximas stories/i);
});

test("ProtectedAreaPage renders an orders-specific operational frame instead of generic placeholder copy", () => {
  const markup = renderToStaticMarkup(
    <ProtectedAreaPage
      routeKey="orders"
      sessionUser={{
        id: 2,
        name: "Bruna Atendimento",
        email: "bruna@example.test",
        role: "atendimento",
        active: true,
      }}
    />,
  );

  assert.equal(markup, '<section class="space-y-6"></section>');
  assert.doesNotMatch(markup, /Perfil em operação/);
  assert.doesNotMatch(markup, /Criação de encomendas/);
  assert.doesNotMatch(markup, /Correção e gestão/);
  assert.doesNotMatch(markup, /Sequência de trabalho nesta área/);
  assert.doesNotMatch(markup, /Capacidades ativas para encomendas/);
  assert.doesNotMatch(markup, /Contexto desta página/);
  assert.doesNotMatch(markup, /Fila operacional e detalhe acionável de encomendas/);
  assert.doesNotMatch(markup, /Estrutura reservada para próximas stories/i);
});
