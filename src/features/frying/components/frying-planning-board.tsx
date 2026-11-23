"use client";

import * as React from "react";
import { CalendarClock, Clock3, PackageCheck } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { Input } from "@/components/ui/input";
import { useOrderSettings, useOrderStores } from "@/features/orders/hooks/use-order-queries";
import { normalizePlanningDay } from "@/features/planning/utils";
import { useFryingPlan } from "../hooks";

function time(value: string | null, timeZone: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-PT", { timeZone, hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
function minutes(seconds: number) { return `${Math.ceil(seconds / 60)} min`; }

export function FryingPlanningBoard() {
  const settings = useOrderSettings();
  const stores = useOrderStores();
  const zone = settings.data?.timezone ?? "Europe/Lisbon";
  const storeOptions = React.useMemo(() => stores.data?.data ?? [], [stores.data]);
  const [date, setDate] = React.useState(() => normalizePlanningDay(undefined, zone));
  const [storeId, setStoreId] = React.useState(0);
  React.useEffect(() => { if (!storeId && storeOptions[0]) setStoreId(storeOptions[0].id); }, [storeId, storeOptions]);
  const plan = useFryingPlan(date, storeId);
  const data = plan.data;

  return <div className="space-y-6">
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2"><p className="text-sm font-medium uppercase tracking-[.24em] text-slate-500">Planeamento</p><h1 className="text-3xl font-semibold tracking-tight text-slate-950">Planeamento de fritura</h1><p className="max-w-3xl text-sm leading-6 text-slate-600">O cálculo começa pelas entregas mais tardias e reserva cada cuba para trás no tempo. A hora de pronto é arredondada para baixo a cada 30 minutos.</p></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-sm font-medium">Data<Input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label className="space-y-1.5 text-sm font-medium">Loja<select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={storeId} onChange={(event) => setStoreId(Number(event.target.value))}><option value={0}>Selecione uma loja</option>{storeOptions.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label></div>
    </section>
    {plan.isLoading ? <p className="text-sm text-muted-foreground">A calcular o planeamento…</p> : null}
    {plan.isError ? <EmptyState title="Não foi possível obter o planeamento" description="Confirme a loja e tente novamente." /> : null}
    {data ? <>
      <div className="grid gap-4 sm:grid-cols-3"><Metric icon={<PackageCheck className="size-5" />} label="Encomendas" value={String(data.ordersCount)} /><Metric icon={<CalendarClock className="size-5" />} label="Tarefas de fritura" value={String(data.tasksCount)} /><Metric icon={<Clock3 className="size-5" />} label="Primeiro início" value={time(data.earliestStartAt, data.timeZone)} /></div>
      {data.warnings.map((warning) => <p key={warning} className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{warning}</p>)}
      {data.tasksCount === 0 ? <EmptyState title="Sem frituras planeadas" description="Não existem cubas ou tempos de fritura configurados para estas encomendas." /> : <div className="grid gap-5 xl:grid-cols-2">{data.slots.map((slot) => <section key={slot.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><header className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-950">{slot.name}</h2><p className="text-sm text-slate-500">{slot.tasks.length} tarefa(s)</p></header><div className="divide-y divide-slate-100">{slot.tasks.map((task) => <article key={task.allocationId} className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-slate-950">{task.productName} <span className="font-normal text-slate-500">× {task.batchUnits}</span></p><p className="mt-1 text-sm text-slate-500">Encomenda #{task.orderId}{task.customerName ? ` · ${task.customerName}` : ""}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{minutes(task.preparationTimeSeconds + task.heatingTimeSeconds)}</span></div><dl className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4"><div><dt className="text-slate-500">Fritura</dt><dd className="font-semibold text-slate-900">{time(task.heatingStartAt ?? task.startAt, data.timeZone)}</dd></div><div><dt className="text-slate-500">Fim</dt><dd className="font-semibold text-slate-900">{time(task.finishAt, data.timeZone)}</dd></div><div><dt className="text-slate-500">Pronto até</dt><dd className="font-semibold text-slate-900">{time(task.readyBy, data.timeZone)}</dd></div><div><dt className="text-slate-500">Entrega</dt><dd className="font-semibold text-slate-900">{time(task.pickupAt, data.timeZone)}</dd></div></dl></article>)}</div></section>)}</div>}
    </> : null}
  </div>;
}
function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-slate-500">{icon}<p className="text-sm">{label}</p></div><p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p></article>; }
