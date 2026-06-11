"use client";

import * as React from "react";
import { Settings2, Phone, RotateCcw, Save, AlertTriangle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  useOperationalSettings,
  useUpdateOperationalSettings,
  useResetOperationalSettings,
  useTestWhatsAppConnection,
} from "../hooks/use-operational-settings";
import {
  normalizeOperationalWhatsAppNumber,
  operationalSettingsSchema,
  type OperationalSettingsFormValues,
  requiresSuccessfulWhatsAppTest,
} from "../operational-settings-validation";

export function OperationalSettingsForm() {
  const { toast } = useToast();
  const query = useOperationalSettings();
  const updateMutation = useUpdateOperationalSettings();
  const resetMutation = useResetOperationalSettings();
  const testWhatsAppMutation = useTestWhatsAppConnection();
  const [testedWhatsAppNumber, setTestedWhatsAppNumber] = React.useState<string | null>(null);

  const form = useForm<OperationalSettingsFormValues>({
    resolver: zodResolver(operationalSettingsSchema),
    defaultValues: {
      ORDER_START_TIME: "12:00",
      ORDER_END_TIME: "20:00",
      ORDER_MINIMUM_MINUTES: 30,
      ORDER_CANCEL_MINUTES: 60,
      ORDER_SCHEDULING_WINDOW_DAYS: 14,
      WHATSAPP_ORDER_TO: "",
    }
  });
  const currentWhatsAppNumber = form.watch("WHATSAPP_ORDER_TO");
  const whatsappNeedsRetest = requiresSuccessfulWhatsAppTest(currentWhatsAppNumber, testedWhatsAppNumber);

  React.useEffect(() => {
    if (query.data) {
      form.reset({
        ORDER_START_TIME: query.data.ORDER_START_TIME,
        ORDER_END_TIME: query.data.ORDER_END_TIME,
        ORDER_MINIMUM_MINUTES: Number(query.data.ORDER_MINIMUM_MINUTES),
        ORDER_CANCEL_MINUTES: Number(query.data.ORDER_CANCEL_MINUTES),
        ORDER_SCHEDULING_WINDOW_DAYS: Number(query.data.ORDER_SCHEDULING_WINDOW_DAYS),
        WHATSAPP_ORDER_TO: query.data.WHATSAPP_ORDER_TO || "",
      });
      setTestedWhatsAppNumber(normalizeOperationalWhatsAppNumber(query.data.WHATSAPP_ORDER_TO) || null);
    }
  }, [query.data, form]);

  async function onSubmit(data: OperationalSettingsFormValues) {
    if (!query.data) return;
    if (whatsappNeedsRetest) {
      toast("Teste a ligação WhatsApp com o número actual antes de guardar.", "error");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        ...data,
        WHATSAPP_ORDER_TO: normalizeOperationalWhatsAppNumber(data.WHATSAPP_ORDER_TO),
        version: query.data.SETTINGS_VERSION,
      });
      toast("Configurações operacionais atualizadas com sucesso.", "success");
    } catch (error: any) {
      if (error.response?.status === 409) {
        toast("Erro de concorrência: as definições foram alteradas por outro utilizador. Recarregando...", "error");
        query.refetch();
      } else {
        toast(error.message || "Erro ao atualizar configurações.", "error");
      }
    }
  }

  async function handleReset() {
    if (!query.data) return;
    if (!confirm("Tem a certeza que deseja restaurar os padrões de fábrica?")) return;

    try {
      await resetMutation.mutateAsync(query.data.SETTINGS_VERSION);
      toast("Configurações restauradas com sucesso.", "success");
    } catch (error: any) {
      if (error.response?.status === 409) {
        toast("Erro de concorrência: as definições foram alteradas por outro utilizador. Recarregando...", "error");
        query.refetch();
      } else {
        toast("Erro ao restaurar configurações.", "error");
      }
    }
  }

  async function handleTestWhatsApp() {
    const number = normalizeOperationalWhatsAppNumber(form.getValues("WHATSAPP_ORDER_TO"));
    if (!number) {
      toast("Insira um número para testar.", "error");
      return;
    }

    try {
      const result = await testWhatsAppMutation.mutateAsync(number);
      if (result.success) {
        setTestedWhatsAppNumber(number);
        toast(result.message, "success");
      } else {
        toast(result.message, "error");
      }
    } catch (error: any) {
      toast("Erro ao testar conexão WhatsApp.", "error");
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
      </section>

      {/* WhatsApp Section */}
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-[#25D366]" />
          <h2 className="text-base font-semibold text-foreground">Notificações WhatsApp</h2>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Número para Receção de Pedidos (E.164)</label>
          <div className="flex gap-2">
            <Input
              {...form.register("WHATSAPP_ORDER_TO")}
              placeholder="+351..."
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
              Teste a ligação com o número actual antes de guardar as alterações.
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
