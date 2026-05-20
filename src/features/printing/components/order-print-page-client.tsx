"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { OrderThermalDocument } from "@/features/printing/components/order-thermal-document";
import { useOrderDetail, useOrderSettings } from "@/features/orders/hooks/use-order-queries";
import {
  type OrderPrintFlowEvent,
  type PrintFlowIntent,
  type PrintFlowState,
  toThermalPrintOrder,
} from "@/lib/printing";

function buildStatusMessage(
  state: PrintFlowState,
  intent: PrintFlowIntent,
  errorMessage?: string | null,
) {
  switch (state) {
    case "preparing":
      return intent === "reprint"
        ? "A carregar a encomenda e a preparar a reimpressão térmica."
        : "A carregar a encomenda e a preparar o layout térmico.";
    case "preview":
      return intent === "reprint"
        ? "Vista térmica pronta para reimpressão. Pode abrir o diálogo novamente sem regressar ao painel."
        : "Vista térmica pronta para imprimir novamente.";
    case "printing":
      return "O browser abriu o diálogo de impressão. Pode imprimir ou cancelar sem perder este contexto.";
    case "success":
      return intent === "reprint"
        ? "A tentativa de reimpressão terminou. Pode voltar a reimprimir a partir desta vista."
        : "A tentativa de impressão terminou. Se precisar, pode voltar a imprimir.";
    case "error":
      return errorMessage ?? "Não foi possível abrir o diálogo de impressão.";
    default:
      return intent === "reprint"
        ? "Vista térmica pronta para reimpressão a partir do registo operacional."
        : "Vista térmica pronta para nova tentativa de impressão.";
  }
}

export function OrderPrintPageClient({
  orderId,
}: Readonly<{
  orderId: string;
}>) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [state, setState] = React.useState<PrintFlowState>("ready");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const attemptedRef = React.useRef(false);
  const reportedLoadErrorRef = React.useRef<string | null>(null);
  const orderQuery = useOrderDetail(orderId);
  const settingsQuery = useOrderSettings();
  const attemptId = searchParams.get("attemptId")?.trim() ?? "";
  const intent: PrintFlowIntent =
    searchParams.get("intent") === "reprint" ? "reprint" : "print";

  const postFlowEvent = React.useCallback(
    (
      nextState: OrderPrintFlowEvent["state"],
      nextErrorMessage?: string | null,
    ) => {
      if (typeof window === "undefined" || !window.opener || !attemptId) {
        return;
      }

      const payload: OrderPrintFlowEvent = {
        type: "order-print-flow",
        orderId,
        attemptId,
        intent,
        state: nextState,
        errorMessage: nextErrorMessage ?? null,
      };

      window.opener.postMessage(payload, window.location.origin);
    },
    [attemptId, intent, orderId],
  );

  const printableOrder = React.useMemo(() => {
    if (!orderQuery.data) {
      return null;
    }

    return toThermalPrintOrder(orderQuery.data, {
      statusLabels: settingsQuery.data?.statusLabels,
      timeZone: settingsQuery.data?.timezone,
    });
  }, [orderQuery.data, settingsQuery.data?.statusLabels, settingsQuery.data?.timezone]);

  const triggerPrint = React.useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    setErrorMessage(null);
    setState("preparing");

    window.setTimeout(() => {
      try {
        setState("printing");
        window.print();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "O browser não conseguiu abrir o diálogo de impressão.";

        setErrorMessage(message);
        setState("error");
        postFlowEvent("error", message);
        toast(message, "error");
      }
    }, 50);
  }, [postFlowEvent, toast]);

  React.useEffect(() => {
    if (!printableOrder) {
      return;
    }

    setState("preview");
    postFlowEvent("preview");
  }, [postFlowEvent, printableOrder]);

  React.useEffect(() => {
    if (!printableOrder || attemptedRef.current) {
      return;
    }

    attemptedRef.current = true;
    triggerPrint();
  }, [printableOrder, triggerPrint]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleBeforePrint = () => {
      setState("printing");
      postFlowEvent("printing");
      toast("Diálogo de impressão aberto.", "info");
    };

    const handleAfterPrint = () => {
      setState("success");
      postFlowEvent("success");
      toast("Tentativa de impressão concluída.", "success");
    };

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [postFlowEvent, toast]);

  React.useEffect(() => {
    if (!orderQuery.error) {
      reportedLoadErrorRef.current = null;
      return;
    }

    const message = orderQuery.error.message;

    if (reportedLoadErrorRef.current === message) {
      return;
    }

    reportedLoadErrorRef.current = message;
    setErrorMessage(message);
    setState("error");
    postFlowEvent("error", message);
    toast(message, "error");
  }, [orderQuery.error, postFlowEvent, toast]);

  if (orderQuery.error) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center gap-4 px-6 py-10 text-center">
        <h1 className="text-lg font-semibold">Não foi possível carregar a encomenda.</h1>
        <p className="text-sm text-muted-foreground">
          {orderQuery.error.message}
        </p>
        <Button type="button" variant="outline" onClick={() => void orderQuery.refetch()}>
          Tentar novamente
        </Button>
      </main>
    );
  }

  if (orderQuery.isLoading || !printableOrder || settingsQuery.isLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[80mm] items-center justify-center px-4 py-10 text-center text-sm text-muted-foreground">
        {intent === "reprint"
          ? `A preparar documento térmico para reimprimir a encomenda #${orderId}...`
          : `A preparar documento térmico da encomenda #${orderId}...`}
      </main>
    );
  }

  return (
    <OrderThermalDocument
      order={printableOrder}
      state={state}
      statusMessage={buildStatusMessage(state, intent, errorMessage)}
      actionSlot={(
        <>
          <Button type="button" onClick={triggerPrint}>
            {intent === "reprint" ? "Reimprimir" : "Imprimir novamente"}
          </Button>
          <Button type="button" variant="outline" onClick={() => window.close()}>
            Fechar
          </Button>
        </>
      )}
    />
  );
}
