import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ProtectedAreaPage } from "@/components/layout/protected-area-page";

test("ProtectedAreaPage renders a real dashboard overview instead of generic placeholder copy", () => {
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
    />,
  );

  assert.match(markup, /Visão geral da operação e acessos disponíveis/);
  assert.match(markup, /Destinos principais/);
  assert.match(markup, /Encomendas/);
  assert.match(markup, /Slots e planeamento/);
  assert.match(markup, /Áreas fora do âmbito deste perfil/);
  assert.match(markup, /Definições e acessos/);
  assert.doesNotMatch(markup, /Estrutura reservada para próximas stories/i);
});

