"use client";

import * as React from "react";
import { Settings2, Phone, RotateCcw, Save, AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  useOperationalSettings,
  usePreparationCapacityConfig,
  useUpdateOperationalSettings,
  useUpdatePreparationCapacityConfig,
  useResetOperationalSettings,
  useTestWhatsAppConnection,
} from "../hooks/use-operational-settings";
import {
  normalizeOperationalWhatsAppRecipient,
  operationalSettingsSchema,
  type OperationalSettingsFormValues,
  requiresSuccessfulWhatsAppTest,
} from "../operational-settings-validation";
import type {
  OperationalPreparationSetting,
  OperationalPreparationSlot,
} from "../types";

function preparationSettingKey(slotLocalId: string, productId: number) {
  return `${slotLocalId}:${productId}`;
}

function normalizePositiveNumber(value: string, fallback: number) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric < 1) {
    return fallback;
  }

  return Math.floor(numeric);
}

export function OperationalSettingsForm() {
  const { toast } = useToast();
  const query = useOperationalSettings();
  const updateMutation = useUpdateOperationalSettings();
  const resetMutation = useResetOperationalSettings();
  const testWhatsAppMutation = useTestWhatsAppConnection();
  const preparationQuery = usePreparationCapacityConfig();
  const updatePreparationMutation = useUpdatePreparationCapacityConfig();
  const [testedWhatsAppRecipient, setTestedWhatsAppRecipient] = React.useState<string | null>(null);
  const [preparationSlots, setPreparationSlots] = React.useState<OperationalPreparationSlot[]>([]);
  const [preparationSettings, setPreparationSettings] = React.useState<OperationalPreparationSetting[]>([]);
  const resolver = zodResolver(
    operationalSettingsSchema as never,
  ) as Resolver<OperationalSettingsFormValues>;

  const form = useForm<OperationalSettingsFormValues>({
    resolver,
    defaultValues: {
      ORDER_START_TIME: "12:00",
      ORDER_END_TIME: "20:00",
      ORDER_MINIMUM_MINUTES: 30,
      ORDER_CANCEL_MINUTES: 60,
      ORDER_SCHEDULING_WINDOW_DAYS: 14,
      ORDER_SLOT_MODE: "periodo",
      WHATSAPP_ORDER_TO: "",
    }
  });
  const currentWhatsAppRecipient = form.watch("WHATSAPP_ORDER_TO");
  const whatsappNeedsRetest = requiresSuccessfulWhatsAppTest(currentWhatsAppRecipient, testedWhatsAppRecipient);

  React.useEffect(() => {
    if (query.data) {
      form.reset({
        ORDER_START_TIME: query.data.ORDER_START_TIME,
        ORDER_END_TIME: query.data.ORDER_END_TIME,
        ORDER_MINIMUM_MINUTES: Number(query.data.ORDER_MINIMUM_MINUTES),
        ORDER_CANCEL_MINUTES: Number(query.data.ORDER_CANCEL_MINUTES),
        ORDER_SCHEDULING_WINDOW_DAYS: Number(query.data.ORDER_SCHEDULING_WINDOW_DAYS),
        ORDER_SLOT_MODE: query.data.ORDER_SLOT_MODE === "horario" ? "horario" : "periodo",
        WHATSAPP_ORDER_TO: query.data.WHATSAPP_ORDER_TO || "",
      });
      setTestedWhatsAppRecipient(normalizeOperationalWhatsAppRecipient(query.data.WHATSAPP_ORDER_TO) || null);
    }
  }, [query.data, form]);

  React.useEffect(() => {
    if (!preparationQuery.data) return;

    setPreparationSlots(preparationQuery.data.slots);
    setPreparationSettings(preparationQuery.data.settings);
  }, [preparationQuery.data]);

  const activePreparationSlots = React.useMemo(
    () =>
      preparationSlots
        .filter((slot) => slot.active)
        .sort((left, right) => left.displayOrder - right.displayOrder),
    [preparationSlots],
  );

  const preparationSettingByKey = React.useMemo(() => {
    const map = new Map<string, OperationalPreparationSetting>();

    preparationSettings.forEach((setting) => {
      map.set(preparationSettingKey(setting.slotLocalId, setting.productId), setting);
    });

    return map;
  }, [preparationSettings]);

  async function onSubmit(data: OperationalSettingsFormValues) {
    if (!query.data) return;
    if (whatsappNeedsRetest) {
      toast("Teste a ligação WhatsApp com o destino actual antes de guardar.", "error");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        ...data,
        WHATSAPP_ORDER_TO: normalizeOperationalWhatsAppRecipient(data.WHATSAPP_ORDER_TO),
        version: query.data.SETTINGS_VERSION,
      });
      toast("Configurações operacionais atualizadas com sucesso.", "success");
    } catch (error: unknown) {
      const err = error as Error & { response?: { status: number } };
      if (err.response?.status === 409) {
        toast("Erro de concorrência: as definições foram alteradas por outro utilizador. Recarregando...", "error");
        query.refetch();
      } else {
        toast(err.message || "Erro ao atualizar configurações.", "error");
      }
    }
  }

  async function handleReset() {
    if (!query.data) return;
    if (!confirm("Tem a certeza que deseja restaurar os padrões de fábrica?")) return;

    try {
      await resetMutation.mutateAsync(query.data.SETTINGS_VERSION);
      toast("Configurações restauradas com sucesso.", "success");
    } catch (error: unknown) {
      const err = error as Error & { response?: { status: number } };
      if (err.response?.status === 409) {
        toast("Erro de concorrência: as definições foram alteradas por outro utilizador. Recarregando...", "error");
        query.refetch();
      } else {
        toast("Erro ao restaurar configurações.", "error");
      }
    }
  }

  async function handleTestWhatsApp() {
    const recipient = normalizeOperationalWhatsAppRecipient(form.getValues("WHATSAPP_ORDER_TO"));
    if (!recipient) {
      toast("Insira um destino WhatsApp para testar.", "error");
      return;
    }

    try {
      const result = await testWhatsAppMutation.mutateAsync(recipient);
      if (result.success) {
        setTestedWhatsAppRecipient(recipient);
        toast(result.message, "success");
      } else {
        toast(result.message, "error");
      }
    } catch {
      toast("Erro ao testar conexão WhatsApp.", "error");
    }
  }

  function addPreparationSlot() {
    const nextIndex = preparationSlots.length;
    setPreparationSlots((current) => [
      ...current,
      {
        localId: `slot-new-${Date.now()}`,
        name: `Cuba ${nextIndex + 1}`,
        active: true,
        displayOrder: nextIndex,
      },
    ]);
  }

  function updatePreparationSlot(
    localId: string,
    patch: Partial<Pick<OperationalPreparationSlot, "name" | "active">>,
  ) {
    setPreparationSlots((current) =>
      current.map((slot) => (slot.localId === localId ? { ...slot, ...patch } : slot)),
    );
  }

  function removePreparationSlot(localId: string) {
    setPreparationSlots((current) =>
      current
        .filter((slot) => slot.localId !== localId)
        .map((slot, index) => ({ ...slot, displayOrder: index })),
    );
    setPreparationSettings((current) =>
      current.filter((setting) => setting.slotLocalId !== localId),
    );
  }

  function updatePreparationSetting(
    slot: OperationalPreparationSlot,
    productId: number,
    patch: Partial<Pick<OperationalPreparationSetting, "batchSize" | "preparationTimeSeconds">>,
  ) {
    setPreparationSettings((current) => {
      const key = preparationSettingKey(slot.localId, productId);
      const existing = current.find(
        (setting) => preparationSettingKey(setting.slotLocalId, setting.productId) === key,
      );

      if (!existing) {
        return [
          ...current,
          {
            operationalPreparationSlotId: slot.id,
            slotLocalId: slot.localId,
            productId,
            batchSize: patch.batchSize ?? 25,
            preparationTimeSeconds: patch.preparationTimeSeconds ?? 0,
          },
        ];
      }

      return current.map((setting) =>
        preparationSettingKey(setting.slotLocalId, setting.productId) === key
          ? { ...setting, ...patch }
          : setting,
      );
    });
  }

  async function handleSavePreparationCapacity() {
    const slotsPayload = preparationSlots.map((slot, index) => ({
      ...(typeof slot.id === "number" ? { id: slot.id } : {}),
      name: slot.name.trim() || `Cuba ${index + 1}`,
      active: slot.active,
      display_order: index,
    }));
    const slotIndexByLocalId = new Map(
      preparationSlots.map((slot, index) => [slot.localId, index]),
    );
    const settingsPayload = preparationSettings
      .filter(
        (setting) =>
          preparationSlots.some((slot) => slot.localId === setting.slotLocalId) &&
          setting.batchSize > 0 &&
          setting.preparationTimeSeconds > 0,
      )
      .map((setting) => ({
        ...(typeof setting.operationalPreparationSlotId === "number"
          ? { operational_preparation_slot_id: setting.operationalPreparationSlotId }
          : { slot_index: slotIndexByLocalId.get(setting.slotLocalId) ?? 0 }),
        product_id: setting.productId,
        batch_size: setting.batchSize,
        preparation_time_seconds: setting.preparationTimeSeconds,
      }));

    try {
      const updated = await updatePreparationMutation.mutateAsync({
        slots: slotsPayload,
        settings: settingsPayload,
      });
      setPreparationSlots(updated.slots);
      setPreparationSettings(updated.settings);
      toast("Capacidade de preparo atualizada com sucesso.", "success");
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : "Erro ao atualizar capacidade de preparo.", "error");
    }
  }

  if (query.isLoading) return <p className="text-sm text-muted-foreground">A carregar configurações...</p>;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {/* Horários Section */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Parâmetros Operacionais Globais</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Início da Janela de Retirada</label>
            <Input {...form.register("ORDER_START_TIME")} type="time" />
            {form.formState.errors.ORDER_START_TIME && (
              <p className="text-xs text-destructive">{form.formState.errors.ORDER_START_TIME.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Fim da Janela de Retirada</label>
            <Input {...form.register("ORDER_END_TIME")} type="time" />
            {form.formState.errors.ORDER_END_TIME && (
              <p className="text-xs text-destructive">{form.formState.errors.ORDER_END_TIME.message}</p>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Antecedência Mínima (min)</label>
            <Input 
              {...form.register("ORDER_MINIMUM_MINUTES", { valueAsNumber: true })} 
              type="number" 
              min={0}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Janela de Cancelamento (min)</label>
            <Input 
              {...form.register("ORDER_CANCEL_MINUTES", { valueAsNumber: true })} 
              type="number" 
              min={0}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Janela de Agendamento (dias)</label>
            <Input 
              {...form.register("ORDER_SCHEDULING_WINDOW_DAYS", { valueAsNumber: true })} 
              type="number" 
              min={1}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Tipo de Slot Operacional</label>
          <Select
            value={form.watch("ORDER_SLOT_MODE")}
            onValueChange={(value) =>
              form.setValue("ORDER_SLOT_MODE", value as OperationalSettingsFormValues["ORDER_SLOT_MODE"], {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger className="max-w-xs">
              <SelectValue placeholder="Selecionar tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="periodo">Período</SelectItem>
              <SelectItem value="horario">Horário</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.ORDER_SLOT_MODE && (
            <p className="text-xs text-destructive">{form.formState.errors.ORDER_SLOT_MODE.message}</p>
          )}
        </div>
      </section>

      <section className="space-y-5 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Capacidade de Preparo</h2>
          </div>
          <Button type="button" variant="outline" onClick={addPreparationSlot} className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar cuba
          </Button>
        </div>

        {preparationQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">A carregar capacidade de preparo...</p>
        ) : preparationQuery.error ? (
          <p className="text-sm text-destructive">Não foi possível carregar a capacidade de preparo.</p>
        ) : (
          <div className="space-y-5">
            <div className="space-y-3">
              {preparationSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sem cubas configuradas. Enquanto não houver cuba ativa, os pedidos não fazem bloqueio por preparo.
                </p>
              ) : (
                preparationSlots.map((slot) => (
                  <div
                    key={slot.localId}
                    className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1fr_auto_auto]"
                  >
                    <Input
                      value={slot.name}
                      onChange={(event) => updatePreparationSlot(slot.localId, { name: event.target.value })}
                      placeholder="Nome da cuba"
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={slot.active}
                        onChange={(event) =>
                          updatePreparationSlot(slot.localId, { active: event.currentTarget.checked })
                        }
                      />
                      Ativa
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => removePreparationSlot(slot.localId)}
                      aria-label={`Remover ${slot.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            {activePreparationSlots.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="whitespace-nowrap px-3 py-2 text-left font-medium">Artigo</th>
                      {activePreparationSlots.map((slot) => (
                        <th key={slot.localId} className="min-w-44 px-3 py-2 text-left font-medium">
                          {slot.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(preparationQuery.data?.products ?? []).map((product) => (
                      <tr key={product.id}>
                        <td className="whitespace-nowrap px-3 py-2 font-medium">{product.name}</td>
                        {activePreparationSlots.map((slot) => {
                          const setting = preparationSettingByKey.get(
                            preparationSettingKey(slot.localId, product.id),
                          );

                          return (
                            <td key={slot.localId} className="px-3 py-2">
                              <div className="grid grid-cols-2 gap-2">
                                <label className="space-y-1">
                                  <span className="text-xs text-muted-foreground">Lote</span>
                                  <Input
                                    type="number"
                                    min={1}
                                    value={setting?.batchSize ?? 25}
                                    onChange={(event) =>
                                      updatePreparationSetting(slot, product.id, {
                                        batchSize: normalizePositiveNumber(event.target.value, 25),
                                      })
                                    }
                                  />
                                </label>
                                <label className="space-y-1">
                                  <span className="text-xs text-muted-foreground">Tempo seg.</span>
                                  <Input
                                    type="number"
                                    min={1}
                                    value={setting?.preparationTimeSeconds ?? ""}
                                    onChange={(event) =>
                                      updatePreparationSetting(slot, product.id, {
                                        preparationTimeSeconds: normalizePositiveNumber(event.target.value, 0),
                                      })
                                    }
                                    placeholder="220"
                                  />
                                </label>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Button
              type="button"
              onClick={handleSavePreparationCapacity}
              disabled={updatePreparationMutation.isPending || preparationQuery.isLoading}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {updatePreparationMutation.isPending ? "A guardar..." : "Guardar capacidade de preparo"}
            </Button>
          </div>
        )}
      </section>

      {/* WhatsApp Section */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-[#25D366]" />
          <h2 className="text-base font-semibold text-foreground">Notificações WhatsApp</h2>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Destino para Receção de Pedidos</label>
          <div className="flex gap-2">
            <Input
              {...form.register("WHATSAPP_ORDER_TO")}
              placeholder="+351... ou id-do-grupo@g.us"
              className="max-w-md"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleTestWhatsApp}
              disabled={testWhatsAppMutation.isPending}
            >
              {testWhatsAppMutation.isPending ? "A testar..." : "Testar Conexão"}
            </Button>
          </div>
          {form.formState.errors.WHATSAPP_ORDER_TO && (
            <p className="text-xs text-destructive">{form.formState.errors.WHATSAPP_ORDER_TO.message}</p>
          )}
          {whatsappNeedsRetest && (
            <p className="text-xs text-amber-600">
              Teste a ligação com o destino actual antes de guardar as alterações.
            </p>
          )}
        </div>
      </section>

      {/* Footer Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={updateMutation.isPending || whatsappNeedsRetest} className="gap-2">
            <Save className="h-4 w-4" />
            {updateMutation.isPending ? "A guardar..." : "Guardar Alterações"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleReset}
            disabled={resetMutation.isPending}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar Padrões
          </Button>
        </div>
        
        {query.data && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            <span>Versão atual: {query.data.SETTINGS_VERSION}</span>
          </div>
        )}
      </div>
    </form>
  );
}
