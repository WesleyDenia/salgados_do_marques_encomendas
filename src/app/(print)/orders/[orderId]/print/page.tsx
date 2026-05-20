import type { Metadata } from "next";

import { OrderPrintPageClient } from "@/features/printing/components/order-print-page-client";

type PrintPageProps = {
  params: Promise<{ orderId: string }>;
};

export const metadata: Metadata = {
  title: "Impressão operacional",
};

export default async function OrderPrintPage({ params }: PrintPageProps) {
  const { orderId } = await params;

  return <OrderPrintPageClient orderId={orderId} />;
}
