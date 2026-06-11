"use client";

import * as React from "react";

import {
  buildPlanningSlotLoadEntries,
  hasCompletePlanningSlotCounts,
} from "@/features/planning/utils";
import { cn } from "@/lib/utils";

type PlanningSlotLoadGroup = {
  id: string;
  label: string;
  slotCounts: Record<string, number>;
  description?: string;
};

export function PlanningSlotLoadSummary({
  title,
  description,
  slotLabels,
  groups,
  compact = false,
  hideGroupLabels = false,
}: Readonly<{
  title?: string;
  description?: string;
  slotLabels: Record<string, string>;
  groups: PlanningSlotLoadGroup[];
  compact?: boolean;
  hideGroupLabels?: boolean;
}>) {
  return (
    <div className={cn("space-y-4", compact ? "space-y-3" : null)}>
      {title || description ? (
        <div className="space-y-2">
          {title ? (
            <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
          ) : null}
          {description ? (
            <p className="text-sm leading-6 text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "grid gap-4",
          groups.length > 1 ? "md:grid-cols-2 xl:grid-cols-3" : null,
        )}
      >
        {groups.map((group) => {
          const entries = buildPlanningSlotLoadEntries(group.slotCounts, slotLabels);
          const aggregateComplete = hasCompletePlanningSlotCounts(group.slotCounts);

          return (
            <div
              key={group.id}
              className={cn(
                "rounded-2xl border border-border/70 bg-background/80",
                compact ? "p-3" : "p-4",
              )}
            >
              {!hideGroupLabels ? (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{group.label}</p>
                  {group.description ? (
                    <p className="text-sm text-muted-foreground">{group.description}</p>
                  ) : null}
                </div>
              ) : null}

              {!aggregateComplete ? (
                <p
                  className={cn(
                    "rounded-xl border border-dashed border-amber-300/70 bg-amber-50/70 text-amber-900",
                    compact ? "mt-3 px-3 py-2 text-xs" : "mt-4 px-3 py-2 text-sm",
                  )}
                >
                  Agregado oficial incompleto: os dados atuais ainda não cobrem
                  todos os slots canónicos.
                </p>
              ) : null}

              {entries.length > 0 ? (
                <dl
                  className={cn(
                    "grid gap-2 text-sm text-muted-foreground",
                    aggregateComplete || compact ? "mt-3" : "mt-4",
                  )}
                >
                  {entries.map((entry) => (
                    <div
                      key={`${group.id}-${entry.slot}`}
                      className="flex items-center justify-between gap-3"
                    >
                      <dt>{entry.label}</dt>
                      <dd className="font-medium text-foreground">
                        {entry.count} encomendas
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p
                  className={cn(
                    "text-muted-foreground",
                    compact ? "mt-3 text-xs" : "mt-4 text-sm",
                  )}
                >
                  O agregado oficial por slot ainda não foi disponibilizado para
                  este conjunto.
                </p>
              )}

              {hideGroupLabels && group.description ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  {group.description}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
