import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ToastProvider } from "@/components/ui/toast";
import {
  mapBackendErrorsToForm,
  OrderComposerDrawer,
} from "@/features/orders/components/order-composer-drawer";

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
  assert.match(markup, /Permitir exceção fora do horário da loja/);

  queryClient.clear();
});

test("OrderComposerDrawer renders edit mode copy for corrections", () => {
  const queryClient = new QueryClient();
  const markup = renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <OrderComposerDrawer
          open
          mode="edit"
          initialOrder={{
            id: 42,
            status: "placed",
            paymentStatus: "pending",
            slot: "manha",
            customerName: "Maria Silva",
            customerContact: "912345678",
            scheduledAt: "2026-05-20T09:30:00+00:00",
            total: 24,
            notes: "Sem picante",
            tags: [],
            store: { id: 3, name: "Loja Centro" },
            user: null,
            items: [
              {
                id: 1,
                productId: 12,
                productName: "Coxinha",
                quantity: 12,
                total: 24,
                variantId: 7,
                flavorIds: [2, 3],
              },
            ],
            createdAt: "2026-05-12T09:30:00+00:00",
          }}
          onOpenChange={() => undefined}
        />
      </ToastProvider>
    </QueryClientProvider>,
  );

  assert.match(markup, /Corrigir encomenda/);
  assert.match(markup, /Guardar correção/);
  assert.match(markup, /Permitir exceção fora do horário da loja/);

  queryClient.clear();
});

test("mapBackendErrorsToForm maps 422 errors to react-hook-form fields", () => {
  const capturedCalls: Array<{
    field: string;
    error: { message?: string };
  }> = [];
  const mockSetError = (field: string, error: { message?: string }) => {
    capturedCalls.push({ field, error });
  };

  const mockError = {
    isAxiosError: true,
    message: "Erro de validação",
    status: 422,
    validationErrors: {
      customer_name: ["O nome é obrigatório"],
      customer_contact: ["Contacto inválido"],
      slot: ["Slot indisponível"],
      payment_status: ["Estado inválido"],
      "items.0.product_id": ["Produto inválido"],
      "items.1.quantity": ["Quantidade insuficiente"]
    }
  };

  mapBackendErrorsToForm(
    mockError,
    mockSetError as Parameters<typeof mapBackendErrorsToForm>[1],
  );

  assert.equal(capturedCalls.length, 6);
  assert.equal(capturedCalls.find(c => c.field === "customerName")?.error.message, "O nome é obrigatório");
  assert.equal(capturedCalls.find(c => c.field === "customerContact")?.error.message, "Contacto inválido");
  assert.equal(capturedCalls.find(c => c.field === "time")?.error.message, "Slot indisponível");
  assert.equal(capturedCalls.find(c => c.field === "paymentStatus")?.error.message, "Estado inválido");
  assert.equal(capturedCalls.find(c => c.field === "items.0.productId")?.error.message, "Produto inválido");
  assert.equal(capturedCalls.find(c => c.field === "items.1.quantity")?.error.message, "Quantidade insuficiente");
});
