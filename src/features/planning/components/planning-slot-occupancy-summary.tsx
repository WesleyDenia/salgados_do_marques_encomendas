"use client";

import * as React from "react";

import { buildPlanningSlotOccupancyEntries } from "@/features/planning/utils";
import type { PlanningSlotOccupancy } from "@/features/planning/types";
import { cn } from "@/lib/utils";

type PlanningSlotOccupancyGroup = {
  id: string;
  label: string;
  slotOccupancy: PlanningSlotOccupancy;
  description?: string;
};

function buildOccupancyTone(state: string | null, contextStatus: string | null) {
  if (contextStatus === "official") {
    switch (state) {
      case "disponível":
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
      case "limitado":
        return "border-amber-200 bg-amber-50 text-amber-700";
      case "bloqueado":
        return "border-rose-200 bg-rose-50 text-rose-700";
      default:
        return "border-border bg-card text-foreground";
    }
  }

  if (contextStatus === "not_applicable") {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  return "border-dashed border-amber-300 bg-amber-50 text-amber-900";
}

function buildOccupancyLabel(state: string | null, contextStatus: string | null) {
  if (contextStatus === "official" && state) {
    return state;
  }

  if (contextStatus === "not_applicable") {
    return "Sem estado oficial";
  }

  return "Contexto oficial insuficiente";
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0m";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

export function PlanningSlotOccupancySummary({
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
  groups: PlanningSlotOccupancyGroup[];
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
          const entries = buildPlanningSlotOccupancyEntries(
            group.slotOccupancy,
            slotLabels,
          );

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

              {entries.length > 0 ? (
                <div
                  className={cn(
                    "grid gap-3",
                    hideGroupLabels || compact ? "mt-3" : "mt-4",
                  )}
                >
                  {entries.map((entry) => (
                    <article
                      key={`${group.id}-${entry.slot}`}
                      className="rounded-xl border border-border/60 bg-card/80 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {entry.label}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {entry.count} encomendas neste conjunto.
                          </p>
                        </div>
                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs font-semibold",
                            buildOccupancyTone(entry.state, entry.contextStatus),
                          )}
                        >
                          {buildOccupancyLabel(entry.state, entry.contextStatus)}
                        </span>
                      </div>

                      {entry.contextReason ? (
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                          {entry.contextReason}
                        </p>
                      ) : null}

                      {entry.preparation && entry.preparation.allocationsCount > 0 ? (
                        <div className="mt-3 border-t border-border/60 pt-3 text-sm text-muted-foreground">
                          <p>
                            Preparo consolidado:{" "}
                            <span className="font-medium text-foreground">
                              {formatDuration(entry.preparation.maxPreparationTimeSeconds)}
                            </span>
                          </p>
                          <p className="mt-1">
                            {entry.preparation.allocationsCount} lotes em{" "}
                            {entry.preparation.preparationSlots.length} cubas.
                          </p>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <p
                  className={cn(
                    "text-muted-foreground",
                    compact ? "mt-3 text-xs" : "mt-4 text-sm",
                  )}
                >
                  A ocupação oficial por slot ainda não foi disponibilizada para este conjunto.
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
