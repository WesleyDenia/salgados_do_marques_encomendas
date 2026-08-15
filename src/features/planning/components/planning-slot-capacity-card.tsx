"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  useSlotCapacityConfig,
  useUpdateSlotCapacityConfig,
} from "@/features/planning/hooks/use-slot-capacity-config";
import type {
  SlotCapacityConfigEntry,
  SlotCapacityConfigInput,
} from "@/features/planning/types";

type PlanningSlotCapacityCardProps = {
  role: string;
};

type SlotCapacityFormProps = {
  entries: SlotCapacityConfigEntry[];
  values: Record<string, string>;
  disabled?: boolean;
  feedback?: string | null;
  feedbackTone?: "success" | "error" | null;
  onChange: (slot: string, value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function PlanningSlotCapacityForm({
  entries,
  values,
  disabled = false,
  feedback,
  feedbackTone = null,
  onChange,
  onSubmit,
}: SlotCapacityFormProps) {
  return (
    <form className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={onSubmit}>
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-slate-950">Capacidade base por slot</h2>
        <p className="text-sm text-slate-600">
          Configuração global dos slots oficiais definidos nas configurações operacionais.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {entries.map((entry) => (
          <label key={entry.slot} className="space-y-2">
            <span className="block text-sm font-medium text-slate-950">{entry.label}</span>
            <Input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={values[entry.slot] ?? ""}
              disabled={disabled}
              aria-label={`Capacidade base de ${entry.label}`}
              onChange={(event) => onChange(entry.slot, event.currentTarget.value)}
            />
          </label>
        ))}
      </div>

      <p className="text-xs text-slate-500">
        `sem_slot` fica fora desta configuração e nunca representa uma janela oficial de capacidade.
      </p>

      {feedback ? (
        <p
          role="status"
          className={
            feedbackTone === "error"
              ? "text-sm text-destructive"
              : "text-sm text-emerald-700"
          }
        >
          {feedback}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={disabled}>
          {disabled ? "A gravar..." : "Guardar capacidade base"}
        </Button>
        <span className="text-xs text-slate-500">
          O backend continua a ser a única fonte de verdade para disponibilidade e aceite.
        </span>
      </div>
    </form>
  );
}

export function PlanningSlotCapacityCard({ role }: PlanningSlotCapacityCardProps) {
  const isAdmin = role === "admin";

  if (!isAdmin) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Capacidade base por slot</h2>
        <p className="mt-2 text-sm text-slate-600">
          A configuração administrativa de capacidade fica visível apenas para administradores.
          O perfil operacional continua a consultar o planeamento normal através das respostas oficiais do backend.
        </p>
      </section>
    );
  }

  return <PlanningSlotCapacityAdminCard />;
}

function PlanningSlotCapacityAdminCard() {
  const { toast } = useToast();
  const query = useSlotCapacityConfig(true);
  const mutation = useUpdateSlotCapacityConfig();
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [feedback, setFeedback] = React.useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);

  React.useEffect(() => {
    if (!query.data) {
      return;
    }

    setValues(Object.fromEntries(
      query.data.slotCapacities.map((entry) => [entry.slot, String(entry.value)]),
    ));
  }, [query.data]);

  const entries = query.data?.slotCapacities ?? [
    { slot: "manha", label: "Manhã", value: 0 },
    { slot: "tarde", label: "Tarde", value: 0 },
    { slot: "noite", label: "Noite", value: 0 },
  ];

  function handleChange(slot: string, value: string) {
    setFeedback(null);
    setValues((current) => ({
      ...current,
      [slot]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const payload = entries.reduce((accumulator, entry) => {
      const slot = entry.slot;
      const parsed = Number.parseInt(values[slot], 10);

      return {
        ...accumulator,
        [slot]: Number.isFinite(parsed) && parsed >= 0 ? parsed : -1,
      };
    }, {} as SlotCapacityConfigInput);

    if (Object.values(payload).some((value) => !Number.isInteger(value) || value < 0)) {
      const message = "Cada slot deve ter um inteiro maior ou igual a 0.";
      setFeedback({ message, tone: "error" });
      toast(message, "error");

      return;
    }

    try {
      const response = await mutation.mutateAsync(payload);

      setValues(Object.fromEntries(
        response.slotCapacities.map((entry) => [entry.slot, String(entry.value)]),
      ));
      setFeedback({ message: "Capacidade base atualizada com sucesso.", tone: "success" });
      toast("Capacidade base atualizada com sucesso.", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível guardar a capacidade base.";

      setFeedback({ message, tone: "error" });
      toast(message, "error");
    }
  }

  if (query.isLoading && !query.data) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-600">A carregar capacidade base oficial...</p>
      </section>
    );
  }

  if (query.error && !query.data) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-destructive">
          Não foi possível carregar a capacidade base oficial.
        </p>
      </section>
    );
  }

  return (
    <PlanningSlotCapacityForm
      entries={entries}
      values={values}
      disabled={mutation.isPending}
      feedback={feedback?.message ?? null}
      feedbackTone={feedback?.tone ?? null}
      onChange={handleChange}
      onSubmit={handleSubmit}
    />
  );
}
