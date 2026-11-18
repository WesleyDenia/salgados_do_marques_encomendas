"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";

export type OrderSubmissionOptions = {
  sendCustomerMessage: boolean;
  printOrder: boolean;
  saveCustomer: boolean;
};

export function OrderSubmissionOptionsDialog({
  open,
  showSaveCustomer = false,
  onClose,
}: Readonly<{
  open: boolean;
  showSaveCustomer?: boolean;
  onClose: (options: OrderSubmissionOptions) => void;
}>) {
  const [sendCustomerMessage, setSendCustomerMessage] = React.useState(false);
  const [printOrder, setPrintOrder] = React.useState(false);
  const [saveCustomer, setSaveCustomer] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setSaveCustomer(showSaveCustomer);
    } else {
      setSendCustomerMessage(false);
      setPrintOrder(false);
      setSaveCustomer(false);
    }
  }, [open, showSaveCustomer]);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-labelledby="order-submission-options-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl">
        <h2 id="order-submission-options-title" className="text-lg font-semibold text-foreground">
          Finalizar encomenda
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Escolha as ações adicionais antes de guardar a encomenda.
        </p>

        <div className="mt-5 space-y-3">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3">
            <input
              checked={sendCustomerMessage}
              className="h-4 w-4 rounded border-border"
              onChange={(event) => setSendCustomerMessage(event.currentTarget.checked)}
              type="checkbox"
            />
            <span className="text-sm font-medium text-foreground">
              Enviar mensagem ao cliente
            </span>
          </label>

          {showSaveCustomer ? (
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3">
              <input
                checked={saveCustomer}
                className="h-4 w-4 rounded border-border"
                onChange={(event) => setSaveCustomer(event.currentTarget.checked)}
                type="checkbox"
              />
              <span className="text-sm font-medium text-foreground">Deseja salvar o cliente</span>
            </label>
          ) : null}

          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3">
            <input
              checked={printOrder}
              className="h-4 w-4 rounded border-border"
              onChange={(event) => setPrintOrder(event.currentTarget.checked)}
              type="checkbox"
            />
            <span className="text-sm font-medium text-foreground">Imprimir encomenda</span>
          </label>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={() => onClose({ sendCustomerMessage, printOrder, saveCustomer })}
            type="button"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
