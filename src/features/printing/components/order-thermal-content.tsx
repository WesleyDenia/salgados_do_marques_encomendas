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
          </header>

          <section className={classes.section}>
            <div className={classes.row}>
              <span className={classes.label}>Nome</span>
              <span className={classes.value}>{order.customerLabel}</span>
            </div>
            <div className={classes.row}>
              <span className={classes.label}>Tel</span>
              <span className={classes.value}>{order.contactLabel}</span>
            </div>
            <div className={classes.row}>
              <span className={classes.label}>Data/Hora</span>
              <span className={classes.value}>{order.scheduledAtLabel}</span>
            </div>
          </section>

          <section className={classes.section}>
            {order.items.map((item) => (
              <div key={item.key} className={classes.item}>
                <div className={classes.itemMeta}>{item.title}</div>
                {item.flavorLines.length > 0 ? (
                  <div className={classes.itemMeta}>
                    <div>Sabores:</div>
                    {item.flavorLines.map((flavor, index) => (
                      <div key={`${item.key}-flavor-${index}`}>- {flavor}</div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </section>

          <section className={classes.section}>
            <div className={classes.row}>
              <span className={classes.label}>Valor</span>
              <span className={classes.value}>{order.totalLabel}</span>
            </div>
            <div className={classes.row}>
              <span className={classes.label}>Status do Pagamento</span>
              <span className={classes.value}>{order.paymentLabel}</span>
            </div>
          </section>

          <section className={classes.section}>
            <p className={classes.sectionTitle}>Obs</p>
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
