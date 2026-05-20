import * as React from "react";

import type { PrintFlowState, ThermalPrintOrder } from "@/lib/printing";
import { PRINT_WIDTH_MM } from "@/lib/printing";

const PRINT_STATE_LABELS: Record<PrintFlowState, string> = {
  ready: "Pronto para imprimir",
  preparing: "A preparar impressão",
  preview: "Vista térmica pronta",
  printing: "Diálogo de impressão aberto",
  success: "Tentativa concluída",
  error: "Erro de impressão",
};

type OrderThermalContentClasses = {
  page?: string;
  wrapper?: string;
  statusBar?: string;
  statusChip?: string;
  actions?: string;
  document?: string;
  header?: string;
  title?: string;
  subtitle?: string;
  section?: string;
  sectionTitle?: string;
  row?: string;
  item?: string;
  itemRow?: string;
  totalRow?: string;
  label?: string;
  value?: string;
  itemMeta?: string;
  notes?: string;
  footer?: string;
};

export function OrderThermalContent({
  order,
  state,
  statusMessage,
  actionSlot,
  classes = {},
}: Readonly<{
  order: ThermalPrintOrder;
  state: PrintFlowState;
  statusMessage: string;
  actionSlot?: React.ReactNode;
  classes?: OrderThermalContentClasses;
}>) {
  return (
    <main className={classes.page}>
      <div className={classes.wrapper}>
        <div className={classes.statusBar}>
          <span className={classes.statusChip}>{PRINT_STATE_LABELS[state]}</span>
          <span>{statusMessage}</span>
        </div>

        {actionSlot ? <div className={classes.actions}>{actionSlot}</div> : null}

        <article
          className={classes.document}
          aria-label={`Documento térmico ${PRINT_WIDTH_MM}mm`}
        >
          <header className={classes.header}>
            <p className={classes.title}>{order.idLabel}</p>
            <p className={classes.subtitle}>{order.statusLabel}</p>
          </header>

          <section className={classes.section}>
            <p className={classes.sectionTitle}>Cliente</p>
            <div className={classes.row}>
              <span className={classes.label}>Nome</span>
              <span className={classes.value}>{order.customerLabel}</span>
            </div>
            <div className={classes.row}>
              <span className={classes.label}>Contacto</span>
              <span className={classes.value}>{order.contactLabel}</span>
            </div>
          </section>

          <section className={classes.section}>
            <p className={classes.sectionTitle}>Logística</p>
            <div className={classes.row}>
              <span className={classes.label}>Loja</span>
              <span className={classes.value}>{order.storeName}</span>
            </div>
            {order.storeAddress ? (
              <div className={classes.row}>
                <span className={classes.label}>Morada</span>
                <span className={classes.value}>{order.storeAddress}</span>
              </div>
            ) : null}
            {order.storePhone ? (
              <div className={classes.row}>
                <span className={classes.label}>Telefone</span>
                <span className={classes.value}>{order.storePhone}</span>
              </div>
            ) : null}
            <div className={classes.row}>
              <span className={classes.label}>Agendamento</span>
              <span className={classes.value}>{order.scheduledAtLabel}</span>
            </div>
            <div className={classes.row}>
              <span className={classes.label}>Slot</span>
              <span className={classes.value}>{order.slotLabel}</span>
            </div>
          </section>

          <section className={classes.section}>
            <p className={classes.sectionTitle}>Itens</p>
            {order.items.map((item) => (
              <div key={item.key} className={classes.item}>
                <div className={classes.itemRow}>
                  <span>{item.productName}</span>
                  <span className={classes.value}>x{item.quantity}</span>
                </div>
                {item.variantName ? (
                  <div className={classes.itemMeta}>Variação: {item.variantName}</div>
                ) : null}
                {item.flavorLabel ? (
                  <div className={classes.itemMeta}>Sabores: {item.flavorLabel}</div>
                ) : null}
                <div className={classes.row}>
                  <span className={classes.label}>Subtotal</span>
                  <span className={classes.value}>{item.totalLabel}</span>
                </div>
              </div>
            ))}
          </section>

          <section className={classes.section}>
            <p className={classes.sectionTitle}>Operacional</p>
            <div className={classes.row}>
              <span className={classes.label}>Pagamento</span>
              <span className={classes.value}>{order.paymentLabel}</span>
            </div>
            <div className={classes.row}>
              <span className={classes.label}>Criada em</span>
              <span className={classes.value}>{order.createdAtLabel}</span>
            </div>
            <div className={classes.totalRow}>
              <span className={classes.sectionTitle}>Total</span>
              <span className={classes.value}>{order.totalLabel}</span>
            </div>
          </section>

          <section className={classes.section}>
            <p className={classes.sectionTitle}>Notas operacionais</p>
            <div className={classes.notes}>{order.notesLabel}</div>
          </section>

          <footer className={classes.footer}>
            Documento térmico operacional {PRINT_WIDTH_MM}mm
          </footer>
        </article>
      </div>
    </main>
  );
}
