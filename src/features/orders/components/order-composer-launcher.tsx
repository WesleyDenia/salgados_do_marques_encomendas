"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { canPerform } from "@/lib/auth/authorization";

export function OrderComposerLauncher({
  role,
}: Readonly<{
  role: string;
}>) {
  if (!canPerform(role, "orders:create")) {
    return null;
  }

  return (
    <Link
      href="/orders/new"
      className={buttonVariants({
        className: "gap-2",
        size: "default",
        variant: "default",
      })}
    >
      <Plus className="size-4" />
      Nova encomenda
    </Link>
  );
}
