import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ToastProvider } from "@/components/ui/toast";
import { OrderComposerDrawer } from "@/features/orders/components/order-composer-drawer";

test("OrderComposerDrawer renders the essential creation fields", () => {
  const queryClient = new QueryClient();
  const markup = renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <OrderComposerDrawer open onOpenChange={() => undefined} />
      </ToastProvider>
    </QueryClientProvider>,
  );

  assert.match(markup, /Nova encomenda/);
  assert.match(markup, /Loja/);
  assert.match(markup, /Cliente/);
  assert.match(markup, /Contacto/);
  assert.match(markup, /Produto/);
  assert.match(markup, /Quantidade/);
  assert.match(markup, /Estado de pagamento/);

  queryClient.clear();
});
