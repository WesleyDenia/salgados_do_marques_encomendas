"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className,
}: Readonly<{
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}>) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-dashed border-border/70 bg-card/70 p-6 text-center",
        className,
      )}
    >
      <div className="mx-auto max-w-2xl space-y-3">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        {action ? <div className="flex justify-center pt-1">{action}</div> : null}
      </div>
    </section>
  );
}
