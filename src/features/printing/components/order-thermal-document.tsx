import styles from "./order-thermal-document.module.css";

import { OrderThermalContent } from "@/features/printing/components/order-thermal-content";
import type { PrintFlowState, ThermalPrintOrder } from "@/lib/printing";

export function OrderThermalDocument({
  order,
  state,
  statusMessage,
  actionSlot,
}: Readonly<{
  order: ThermalPrintOrder;
  state: PrintFlowState;
  statusMessage: string;
  actionSlot?: React.ReactNode;
}>) {
  return (
    <OrderThermalContent
      order={order}
      state={state}
      statusMessage={statusMessage}
      actionSlot={actionSlot}
      classes={styles}
    />
  );
}
