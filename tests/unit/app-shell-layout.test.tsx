import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AppShellNavigation } from "@/components/layout/app-shell-layout";

function renderShell(role: string) {
  return renderToStaticMarkup(
    <AppShellNavigation role={role} />,
  );
}

test("AppShellNavigation shows only navigation entries supported by the role model", () => {
  const adminMarkup = renderShell("admin");
  const atendimentoMarkup = renderShell("atendimento");

  // Verify by href to avoid brittle text-label dependency
  assert.match(adminMarkup, /href="\/dashboard"/);
  assert.match(adminMarkup, /href="\/orders"/);
  assert.match(adminMarkup, /href="\/planning"/);
  assert.match(adminMarkup, /href="\/settings\/access"/);
  assert.match(adminMarkup, /href="\/audit\/investigation"/);

  assert.match(atendimentoMarkup, /href="\/dashboard"/);
  assert.match(atendimentoMarkup, /href="\/orders"/);
  assert.doesNotMatch(atendimentoMarkup, /href="\/planning"/);
  assert.doesNotMatch(atendimentoMarkup, /href="\/settings\/access"/);
  assert.doesNotMatch(atendimentoMarkup, /href="\/audit\/investigation"/);
});
