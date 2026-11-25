"use client";

import * as React from "react";
import { Clock3, LayoutGrid, List, PackageCheck } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOrderSettings, useOrderStores } from "@/features/orders/hooks/use-order-queries";
import { normalizePlanningDay } from "@/features/planning/utils";
import type { FryingPlan, FryingSlot } from "../types";
import { useFryingPlan } from "../hooks";

const FRYING_PLAN_VIEW_MODE_STORAGE_KEY = "frying-planning-view-mode";

type ViewMode = "list" | "cards";

type FryingOrderSummary = {
  orderId: number;
  customerName: string | null;
  products: Set<string>;
  slotNames: Set<string>;
  startAt: string | null;
  finishAt: string | null;
  pickupAt: string | null;
};

function time(value: string | null, timeZone: string) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("pt-PT", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function earliest(left: string | null, right: string | null) {
  if (!left) return right;
  if (!right) return left;

  return new Date(left).getTime() <= new Date(right).getTime() ? left : right;
}

function latest(left: string | null, right: string | null) {
  if (!left) return right;
  if (!right) return left;

  return new Date(left).getTime() >= new Date(right).getTime() ? left : right;
}

function summarizeOrders(slots: FryingSlot[]): FryingOrderSummary[] {
  const summaries = new Map<number, FryingOrderSummary>();

  for (const slot of slots) {
    for (const task of slot.tasks) {
      const current = summaries.get(task.orderId) ?? {
        orderId: task.orderId,
        customerName: task.customerName,
        products: new Set<string>(),
        slotNames: new Set<string>(),
        startAt: null,
        finishAt: null,
        pickupAt: task.pickupAt,
      };
      const startAt = task.heatingStartAt ?? task.startAt;

      current.products.add(task.productName);
      current.slotNames.add(slot.name);
      current.startAt = earliest(current.startAt, startAt);
      current.finishAt = latest(current.finishAt, task.finishAt);
      current.pickupAt ??= task.pickupAt;
      summaries.set(task.orderId, current);
    }
  }

  return [...summaries.values()].sort((left, right) => {
    const leftStart = left.startAt ? new Date(left.startAt).getTime() : Number.MAX_SAFE_INTEGER;
    const rightStart = right.startAt ? new Date(right.startAt).getTime() : Number.MAX_SAFE_INTEGER;

    return leftStart - rightStart || left.orderId - right.orderId;
  });
}

function ProductList({ products }: Readonly<{ products: Set<string> }>) {
  return (
    <ul className="space-y-1 pt-1 text-sm leading-6 text-slate-700">
      {[...products].map((product) => <li key={product}>{product}</li>)}
    </ul>
  );
}

function slotSummary(slotNames: Set<string>) {
  return [...slotNames].join(", ");
}

function TimingDetails({
  summary,
  timeZone,
}: Readonly<{
  summary: FryingOrderSummary;
  timeZone: string;
}>) {
  return (
    <dl className="grid grid-cols-3 gap-x-3">
      <TimingDetail label="Início" value={time(summary.startAt, timeZone)} />
      <TimingDetail label="Término" value={time(summary.finishAt, timeZone)} />
      <TimingDetail label="Entrega" value={time(summary.pickupAt, timeZone)} />
    </dl>
  );
}

function TimingDetail({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <dt className="text-sm font-semibold text-slate-950">{label}</dt>
      <dd className="mt-1 text-lg font-medium tabular-nums text-slate-700">{value}</dd>
    </div>
  );
}

function PlanningCards({ summaries, data }: Readonly<{ summaries: FryingOrderSummary[]; data: FryingPlan }>) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {summaries.map((summary) => (
        <article key={summary.orderId} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <header className="space-y-1 border-b border-slate-100 pb-4">
            <h2 className="text-base font-semibold text-slate-950">Encomenda #{summary.orderId}</h2>
            <p className="text-sm text-slate-600">{summary.customerName ?? "Cliente não identificado"}</p>
            <ProductList products={summary.products} />
            <p className="text-sm text-slate-500">{slotSummary(summary.slotNames)}</p>
          </header>
          <div className="pt-4">
            <TimingDetails summary={summary} timeZone={data.timeZone} />
          </div>
        </article>
      ))}
    </div>
  );
}

function PlanningList({ summaries, data }: Readonly<{ summaries: FryingOrderSummary[]; data: FryingPlan }>) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/80">
            <TableHead>Encomenda</TableHead>
            <TableHead>Produtos</TableHead>
            <TableHead>Cuba</TableHead>
            <TableHead>Início</TableHead>
            <TableHead>Término</TableHead>
            <TableHead>Entrega</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {summaries.map((summary) => (
            <TableRow key={summary.orderId} className="hover:bg-slate-50/80">
              <TableCell className="font-semibold text-slate-950">#{summary.orderId}<span className="mt-1 block text-sm font-normal text-slate-600">{summary.customerName ?? "Cliente não identificado"}</span></TableCell>
              <TableCell className="text-base text-slate-700"><ProductList products={summary.products} /></TableCell>
              <TableCell className="text-base text-slate-700">{slotSummary(summary.slotNames)}</TableCell>
              <TableCell className="text-base font-medium tabular-nums text-slate-900">{time(summary.startAt, data.timeZone)}</TableCell>
              <TableCell className="text-base font-medium tabular-nums text-slate-900">{time(summary.finishAt, data.timeZone)}</TableCell>
              <TableCell className="text-base font-medium tabular-nums text-slate-900">{time(summary.pickupAt, data.timeZone)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function FryingPlanningBoard() {
  const settings = useOrderSettings();
  const stores = useOrderStores();
  const zone = settings.data?.timezone ?? "Europe/Lisbon";
  const storeOptions = React.useMemo(() => stores.data?.data ?? [], [stores.data]);
  const [date, setDate] = React.useState(() => normalizePlanningDay(undefined, zone));
  const [storeId, setStoreId] = React.useState(0);
  const [viewMode, setViewMode] = React.useState<ViewMode>("list");
  React.useEffect(() => { if (!storeId && storeOptions[0]) setStoreId(storeOptions[0].id); }, [storeId, storeOptions]);
  React.useEffect(() => {
    const savedViewMode = window.localStorage.getItem(FRYING_PLAN_VIEW_MODE_STORAGE_KEY);
    if (savedViewMode === "list" || savedViewMode === "cards") setViewMode(savedViewMode);
  }, []);
  const plan = useFryingPlan(date, storeId);
  const data = plan.data;
  const summaries = React.useMemo(() => summarizeOrders(data?.slots ?? []), [data?.slots]);

  function updateViewMode(nextViewMode: ViewMode) {
    setViewMode(nextViewMode);
    window.localStorage.setItem(FRYING_PLAN_VIEW_MODE_STORAGE_KEY, nextViewMode);
  }

  return <div className="space-y-6">
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-base font-medium text-slate-900">Data<Input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <label className="space-y-1.5 text-base font-medium text-slate-900">Loja<select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={storeId} onChange={(event) => setStoreId(Number(event.target.value))}><option value={0}>Selecione uma loja</option>{storeOptions.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label>
        </div>
        <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          <Button type="button" variant={viewMode === "list" ? "default" : "ghost"} size="icon-sm" className="size-8" aria-label="Exibir em lista" onClick={() => updateViewMode("list")}><List className="size-4" /></Button>
          <Button type="button" variant={viewMode === "cards" ? "default" : "ghost"} size="icon-sm" className="size-8" aria-label="Exibir em cartões" onClick={() => updateViewMode("cards")}><LayoutGrid className="size-4" /></Button>
        </div>
      </div>
    </section>
    {plan.isLoading ? <p className="text-base text-muted-foreground">A calcular o planeamento…</p> : null}
    {plan.isError ? <EmptyState title="Não foi possível obter o planeamento" description="Confirme a loja e tente novamente." /> : null}
    {data ? <>
      <div className="grid gap-4 sm:grid-cols-2"><Metric icon={<PackageCheck className="size-5" />} label="Encomendas" value={String(data.ordersCount)} /><Metric icon={<Clock3 className="size-5" />} label="Primeiro início" value={time(data.earliestStartAt, data.timeZone)} /></div>
      {data.warnings.map((warning) => <p key={warning} className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-base text-amber-900">{warning}</p>)}
      {summaries.length === 0 ? <EmptyState title="Sem frituras planeadas" description="Não existem cubas ou tempos de fritura configurados para estas encomendas." /> : viewMode === "cards" ? <PlanningCards summaries={summaries} data={data} /> : <PlanningList summaries={summaries} data={data} />}
    </> : null}
  </div>;
}

function Metric({ icon, label, value }: Readonly<{ icon: React.ReactNode; label: string; value: string }>) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-slate-500">{icon}<p className="text-base">{label}</p></div><p className="mt-3 text-2xl font-semibold tabular-nums text-slate-950">{value}</p></article>;
}
