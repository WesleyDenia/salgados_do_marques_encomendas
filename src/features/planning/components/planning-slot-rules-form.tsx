"use client";

import * as React from "react";
import { Plus, Trash2, Clock, Ban } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useOperationalRules, useUpdateOperationalRules } from "@/features/planning/hooks/use-operational-rules";
import type { PlanningSlotOperationalRules } from "@/features/planning/types";

export function PlanningSlotRulesForm() {
  const { toast } = useToast();
  const query = useOperationalRules();
  const mutation = useUpdateOperationalRules();

  const [leadTimes, setLeadTimes] = React.useState<Record<string, string>>({});

  const [blockedDates, setBlockedDates] = React.useState<Array<{ date: string; slots: string[] }>>([]);

  const [newBlockedDate, setNewBlockedDate] = React.useState("");
  const [newBlockedSlots, setNewBlockedSlots] = React.useState<string[]>([]);
  const slots = React.useMemo(
    () =>
      query.data?.slots.length
        ? query.data.slots
        : [
            { slot: "manha", label: "Manhã", start: 480, end: 719 },
            { slot: "tarde", label: "Tarde", start: 720, end: 1079 },
            { slot: "noite", label: "Noite", start: 1080, end: 1379 },
          ],
    [query.data?.slots],
  );

  React.useEffect(() => {
    if (!query.data) return;

    setLeadTimes(Object.fromEntries(
      slots.map((slot) => [slot.slot, String(query.data?.rules.lead_times[slot.slot] ?? 0)]),
    ));

    setBlockedDates(query.data.rules.blocked_dates);
    setNewBlockedSlots(slots.map((slot) => slot.slot));
  }, [query.data, slots]);

  function handleLeadTimeChange(slot: string, value: string) {
    setLeadTimes((prev) => ({ ...prev, [slot]: value }));
  }

  function handleAddBlockedDate() {
    if (!newBlockedDate) {
      toast("Selecione uma data para bloquear.", "error");
      return;
    }

    if (newBlockedSlots.length === 0) {
      toast("Selecione pelo menos um slot para bloquear.", "error");
      return;
    }

    if (blockedDates.some((d) => d.date === newBlockedDate)) {
      toast("Esta data já possui bloqueios configurados.", "error");
      return;
    }

    setBlockedDates((prev) => [...prev, { date: newBlockedDate, slots: [...newBlockedSlots] }].sort((a, b) => a.date.localeCompare(b.date)));
    setNewBlockedDate("");
  }

  function handleRemoveBlockedDate(index: number) {
    setBlockedDates((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleNewBlockedSlot(slot: string) {
    setNewBlockedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  }

  async function handleSave() {
    const payload: PlanningSlotOperationalRules = {
      lead_times: Object.fromEntries(
        slots.map((slot) => [slot.slot, parseInt(leadTimes[slot.slot], 10) || 0]),
      ),
      blocked_dates: blockedDates.map((item) => ({
        date: item.date,
        slots: item.slots.filter((slot) => slots.some((definition) => definition.slot === slot)),
      })),
    };

    try {
      await mutation.mutateAsync(payload);
      toast("Regras operacionais atualizadas com sucesso.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Erro ao atualizar regras.", "error");
    }
  }

  if (query.isLoading) return <p className="text-sm text-muted-foreground">A carregar regras...</p>;

  return (
    <div className="space-y-8">
      {/* Lead Times Section */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Lead Times (Antecedência mínima)</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Tempo em minutos necessário entre a hora atual e o início do slot para permitir encomendas.
        </p>

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          {slots.map((slot) => (
            <label key={slot.slot} className="space-y-2">
              <span className="block text-sm font-medium text-foreground">{slot.label}</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  value={leadTimes[slot.slot] ?? ""}
                  onChange={(e) => handleLeadTimeChange(slot.slot, e.target.value)}
                  className="w-full"
                />
                <span className="text-xs text-muted-foreground">min</span>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Blocked Dates Section */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Ban className="h-5 w-5 text-destructive" />
          <h2 className="text-base font-semibold text-foreground">Bloqueios de Datas Específicas</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Impeça encomendas em datas específicas para os slots selecionados.
        </p>

        <div className="flex flex-wrap items-end gap-4 rounded-lg border border-dashed border-border p-4">
          <div className="space-y-2">
            <span className="block text-sm font-medium text-foreground">Nova data</span>
            <Input
              type="date"
              value={newBlockedDate}
              onChange={(e) => setNewBlockedDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-2">
            <span className="block text-sm font-medium text-foreground">Slots</span>
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => (
                <Button
                  key={slot.slot}
                  type="button"
                  variant={newBlockedSlots.includes(slot.slot) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleNewBlockedSlot(slot.slot)}
                >
                  {slot.label}
                </Button>
              ))}
            </div>
          </div>
          <Button type="button" onClick={handleAddBlockedDate} variant="outline" size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {blockedDates.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground italic">Nenhuma data bloqueada.</p>
          ) : (
            <div className="divide-y divide-border">
              {blockedDates.map((item, index) => (
                <div key={item.date} className="flex items-center justify-between py-3">
                  <div className="space-y-1">
                    <span className="font-medium text-foreground">{item.date}</span>
                    <div className="flex gap-1">
                      {item.slots.map((s) => (
                        <span key={s} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                          {slots.find((slot) => slot.slot === s)?.label ?? s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveBlockedDate(index)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={mutation.isPending} className="px-8">
          {mutation.isPending ? "A gravar..." : "Guardar Regras Operacionais"}
        </Button>
        <span className="text-xs text-muted-foreground">
          As regras entram em vigor imediatamente após guardar.
        </span>
      </div>
    </div>
  );
}
