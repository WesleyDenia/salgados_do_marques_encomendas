"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OrderComposerDrawer } from "@/features/orders/components/order-composer-drawer";
import { canPerform } from "@/lib/auth/authorization";

export function OrderComposerLauncher({
  role,
}: Readonly<{
  role: string;
}>) {
  const [open, setOpen] = React.useState(false);

  if (!canPerform(role, "orders:create")) {
    return null;
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Nova encomenda
      </Button>
      <OrderComposerDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
