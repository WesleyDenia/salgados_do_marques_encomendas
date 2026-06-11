"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { PlanningSlotCapacityCard } from "@/features/planning/components/planning-slot-capacity-card";
import { useOrderSettings } from "@/features/orders/hooks/use-order-queries";
import { PlanningCustomPeriodView } from "@/features/planning/components/planning-custom-period-view";
import { PlanningDailyView } from "@/features/planning/components/planning-daily-view";
import { PlanningWeeklyView } from "@/features/planning/components/planning-weekly-view";
import { PlanningSlotRulesForm } from "@/features/planning/components/planning-slot-rules-form";
import {
  buildPlanningDayFromWeekStart,
  buildPlanningPeriodFromDay,
  buildPlanningPeriodFromWeekStart,
  normalizePlanningDay,
  normalizePlanningWeekStart,
  resolvePlanningPeriodState,
} from "@/features/planning/utils";

type PlanningPeriodViewProps = {
  role: string;
};

export function PlanningPeriodView({ role }: PlanningPeriodViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const settingsQuery = useOrderSettings();
  const normalizedTimeZone = settingsQuery.data?.timezone ?? "Europe/Lisbon";
  const planningState = resolvePlanningPeriodState(
    searchParams.get("view"),
    searchParams.get("day"),
    searchParams.get("week_start"),
    searchParams.get("start_date"),
    searchParams.get("end_date"),
    normalizedTimeZone,
  );
  const { view, day, weekStart } = planningState;
  const periodState = view === "period" ? planningState : null;

  React.useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;

    if (searchParams.get("view") !== view) {
      params.set("view", view);
      changed = true;
    }

    if (searchParams.get("day") !== day) {
      params.set("day", day);
      changed = true;
    }

    if (searchParams.get("week_start") !== weekStart) {
      params.set("week_start", weekStart);
      changed = true;
    }

    if (view === "period") {
      const nextStartDate = periodState?.startDate ?? "";
      const nextEndDate = periodState?.endDate ?? "";

      if (searchParams.get("start_date") !== nextStartDate) {
        if (nextStartDate) {
          params.set("start_date", nextStartDate);
        } else {
          params.delete("start_date");
        }
        changed = true;
      }

      if (searchParams.get("end_date") !== nextEndDate) {
        if (nextEndDate) {
          params.set("end_date", nextEndDate);
        } else {
          params.delete("end_date");
        }
        changed = true;
      }
    } else {
      if (searchParams.has("start_date")) {
        params.delete("start_date");
        changed = true;
      }

      if (searchParams.has("end_date")) {
        params.delete("end_date");
        changed = true;
      }
    }

    if (!changed) {
      return;
    }

    router.replace(`${pathname}?${params.toString()}`, {
      scroll: false,
    });
  }, [day, pathname, periodState?.endDate, periodState?.startDate, router, searchParams, view, weekStart]);

  function replacePlanningState(next: {
    view?: "day" | "week" | "period" | "rules";
    day?: string;
    weekStart?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const params = new URLSearchParams(searchParams.toString());

    params.set("view", next.view ?? view);
    params.set("day", next.day ?? day);
    params.set("week_start", next.weekStart ?? weekStart);

    if (next.startDate !== undefined) {
      if (next.startDate) {
        params.set("start_date", next.startDate);
      } else {
        params.delete("start_date");
      }
    }

    if (next.endDate !== undefined) {
      if (next.endDate) {
        params.set("end_date", next.endDate);
      } else {
        params.delete("end_date");
      }
    }

    router.replace(`${pathname}?${params.toString()}`, {
      scroll: false,
    });
  }

  function handleViewChange(nextView: "day" | "week" | "period" | "rules") {
    if (nextView === view) {
      return;
    }

    if (nextView === "rules") {
      replacePlanningState({ view: "rules" });
      return;
    }

    if (nextView === "period") {
      const seededPeriod =
        view === "week"
          ? buildPlanningPeriodFromWeekStart(weekStart)
          : buildPlanningPeriodFromDay(day);

      replacePlanningState({
        view: "period",
        startDate: seededPeriod.startDate,
        endDate: seededPeriod.endDate,
      });

      return;
    }

    if (view === "period") {
      const anchorDay = periodState?.startDate || day;
      const anchorWeekStart = normalizePlanningWeekStart(anchorDay, normalizedTimeZone);

      replacePlanningState({
        view: nextView,
        day: anchorDay,
        weekStart: anchorWeekStart,
        startDate: "",
        endDate: "",
      });

      return;
    }

    replacePlanningState({ view: nextView });
  }

  function handleDayChange(value: string) {
    const nextDay = normalizePlanningDay(value, normalizedTimeZone);

    replacePlanningState({
      day: nextDay,
      weekStart: normalizePlanningWeekStart(nextDay, normalizedTimeZone),
    });
  }

  function handleWeekStartChange(value: string) {
    const nextWeekStart = normalizePlanningWeekStart(value, normalizedTimeZone);

    replacePlanningState({
      day: buildPlanningDayFromWeekStart(day, weekStart, nextWeekStart),
      weekStart: nextWeekStart,
    });
  }

  return (
    <section className="space-y-6">
      {view !== "rules" && <PlanningSlotCapacityCard role={role} />}

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant={view === "day" ? "default" : "outline"}
          onClick={() => handleViewChange("day")}
        >
          Vista diária
        </Button>
        <Button
          type="button"
          variant={view === "week" ? "default" : "outline"}
          onClick={() => handleViewChange("week")}
        >
          Vista semanal
        </Button>
        <Button
          type="button"
          variant={view === "period" ? "default" : "outline"}
          onClick={() => handleViewChange("period")}
        >
          Período personalizado
        </Button>
        {role === "admin" && (
          <Button
            type="button"
            variant={view === "rules" ? "default" : "outline"}
            onClick={() => handleViewChange("rules")}
          >
            Regras operacionais
          </Button>
        )}
      </div>

      {view === "rules" ? (
        <PlanningSlotRulesForm />
      ) : view === "period" ? (
        <PlanningCustomPeriodView
          startDate={periodState?.startDate ?? ""}
          endDate={periodState?.endDate ?? ""}
          periodStatus={periodState?.periodStatus ?? "incomplete"}
          onStartDateChange={(value) =>
            replacePlanningState({
              startDate: value.trim(),
            })
          }
          onEndDateChange={(value) =>
            replacePlanningState({
              endDate: value.trim(),
            })
          }
        />
      ) : view === "week" ? (
        <PlanningWeeklyView
          weekStart={weekStart}
          onWeekStartChange={handleWeekStartChange}
        />
      ) : (
        <PlanningDailyView day={day} onDayChange={handleDayChange} />
      )}
    </section>
  );
}
