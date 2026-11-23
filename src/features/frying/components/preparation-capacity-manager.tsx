"use client";

import * as React from "react";
import { CopyPlus, Pencil, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useOrderStores } from "@/features/orders/hooks/use-order-queries";
import type { PreparationSetting, PreparationSlot } from "../types";
import {
  useCreatePreparationSlot,
  useDeletePreparationSlot,
  useDeletePreparationTime,
  usePreparationCapacity,
  useSavePreparationTime,
  useUpdatePreparationSlot,
  useUpdatePreparationTime,
} from "../hooks";

const humanMinutes = (seconds: number) => `${seconds / 60 % 1 === 0 ? seconds / 60 : (seconds / 60).toFixed(1)} min`;

export function PreparationCapacityManager() {
  const { toast } = useToast();
  const stores = useOrderStores();
  const [storeId, setStoreId] = React.useState(0);
  const [slotName, setSlotName] = React.useState("");
  const [heatingMinutes, setHeatingMinutes] = React.useState("0");
  const [cloneFrom, setCloneFrom] = React.useState<number | undefined>();
  const [editingSlot, setEditingSlot] = React.useState<PreparationSlot | null>(null);
  const [slotDialog, setSlotDialog] = React.useState(false);
  const [timeSlot, setTimeSlot] = React.useState<number | null>(null);
  const [editingTime, setEditingTime] = React.useState<PreparationSetting | null>(null);
  const [productId, setProductId] = React.useState(0);
  const [batch, setBatch] = React.useState("25");
  const [prepMinutes, setPrepMinutes] = React.useState("3");
  const storeOptions = React.useMemo(() => stores.data?.data ?? [], [stores.data]);
  const capacity = usePreparationCapacity(storeId);
  const create = useCreatePreparationSlot();
  const updateSlot = useUpdatePreparationSlot();
  const deleteSlot = useDeletePreparationSlot();
  const save = useSavePreparationTime();
  const updateTime = useUpdatePreparationTime();
  const deleteTime = useDeletePreparationTime();
  const data = capacity.data;

  React.useEffect(() => {
    if (!storeId && storeOptions[0]) setStoreId(storeOptions[0].id);
  }, [storeId, storeOptions]);

  const closeSlotDialog = () => {
    setSlotDialog(false);
    setEditingSlot(null);
    setCloneFrom(undefined);
    setHeatingMinutes("0");
  };
  const openSlot = (clone?: PreparationSlot) => {
    setEditingSlot(null);
    setCloneFrom(clone?.id);
    setSlotName(clone ? `${clone.name} (cópia)` : "");
    setHeatingMinutes(String((clone?.heatingTimeSeconds ?? 0) / 60));
    setSlotDialog(true);
  };
  const openSlotEditor = (slot: PreparationSlot) => {
    setCloneFrom(undefined);
    setEditingSlot(slot);
    setSlotName(slot.name);
    setHeatingMinutes(String(slot.heatingTimeSeconds / 60));
    setSlotDialog(true);
  };
  const closeTimeDialog = () => {
    setTimeSlot(null);
    setEditingTime(null);
  };
  const openTimeEditor = (setting: PreparationSetting) => {
    setEditingTime(setting);
    setTimeSlot(setting.slotId);
    setProductId(setting.productId);
    setBatch(String(setting.batchSize));
    setPrepMinutes(String(setting.preparationTimeSeconds / 60));
  };
  const openNewTime = (slotId: number) => {
    setEditingTime(null);
    setTimeSlot(slotId);
    setProductId(data?.products[0]?.id ?? 0);
    setBatch("25");
    setPrepMinutes("3");
  };
  const submitSlot = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!slotName.trim()) return;
    try {
      if (editingSlot) {
        await updateSlot.mutateAsync({ storeId, slotId: editingSlot.id, name: slotName.trim(), heatingMinutes: Number(heatingMinutes) });
        toast("Cuba atualizada.", "success");
      } else {
        await create.mutateAsync({ storeId, name: slotName.trim(), heatingMinutes: Number(heatingMinutes), cloneFromSlotId: cloneFrom });
        toast(cloneFrom ? "Cuba clonada com os tempos de fritura." : "Cuba adicionada.", "success");
      }
      closeSlotDialog();
    } catch {
      toast("Não foi possível guardar a cuba.", "error");
    }
  };
  const submitTime = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!timeSlot || !productId || Number(batch) < 1 || Number(prepMinutes) <= 0) return;
    try {
      const values = { storeId, slotId: timeSlot, productId, batchSize: Number(batch), preparationMinutes: Number(prepMinutes) };
      if (editingTime) {
        await updateTime.mutateAsync({ ...values, settingId: editingTime.id });
        toast("Tempo de fritura atualizado.", "success");
      } else {
        await save.mutateAsync(values);
        toast("Tempo de fritura guardado.", "success");
      }
      closeTimeDialog();
    } catch {
      toast("Não foi possível guardar o tempo.", "error");
    }
  };
  const removeSlot = async (slot: PreparationSlot) => {
    if (!window.confirm(`Excluir a cuba “${slot.name}” e todos os respetivos tempos de fritura?`)) return;
    try {
      await deleteSlot.mutateAsync({ storeId, slotId: slot.id });
      toast("Cuba excluída.", "success");
    } catch {
      toast("Não foi possível excluir a cuba.", "error");
    }
  };
  const removeTime = async (setting: PreparationSetting) => {
    if (!window.confirm("Excluir este tempo de fritura?")) return;
    try {
      await deleteTime.mutateAsync({ storeId, settingId: setting.id });
      toast("Tempo de fritura excluído.", "success");
    } catch {
      toast("Não foi possível excluir o tempo.", "error");
    }
  };

  const slotSaving = create.isPending || updateSlot.isPending;
  const timeSaving = save.isPending || updateTime.isPending;
  return <div className="space-y-6">
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2"><p className="text-sm font-medium uppercase tracking-[.24em] text-slate-500">Configuração</p><h1 className="text-3xl font-semibold tracking-tight text-slate-950">Cubas e fritura</h1><p className="max-w-3xl text-sm leading-6 text-slate-600">Defina as cubas de cada loja e o tempo de fritura por artigo. Ao clonar, todos os tempos são copiados.</p></div>
        <Button onClick={() => openSlot()} disabled={!storeId}><Plus />Adicionar cuba</Button>
      </div>
      <label className="mt-6 block max-w-md space-y-1.5 text-sm font-medium">Loja<select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={storeId} onChange={(event) => setStoreId(Number(event.target.value))}><option value={0}>Selecione uma loja</option>{storeOptions.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select></label>
    </section>
    {capacity.isLoading ? <p className="text-sm text-muted-foreground">A carregar cubas…</p> : null}
    {capacity.isError ? <EmptyState title="Não foi possível carregar as cubas" description="Tente novamente dentro de momentos." /> : null}
    {data && (data.slots.length ? <div className="grid gap-5 lg:grid-cols-2">{data.slots.map((slot) => {
      const settings = data.settings.filter((setting) => setting.slotId === slot.id);
      return <article key={slot.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">{slot.name}</h2><p className="text-sm text-slate-500">{settings.length} artigo(s) configurado(s) · aquecimento: {humanMinutes(slot.heatingTimeSeconds)}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => openSlotEditor(slot)}><Pencil />Editar</Button><Button size="sm" variant="outline" onClick={() => openSlot(slot)}><CopyPlus />Clonar cuba</Button><Button size="sm" onClick={() => openNewTime(slot.id)}><Plus />Adicionar tempo</Button><Button size="icon-sm" variant="destructive" onClick={() => removeSlot(slot)} disabled={deleteSlot.isPending} aria-label={`Excluir ${slot.name}`}><Trash2 /></Button></div></div>
        <div className="mt-5 space-y-2">{settings.length ? settings.map((setting) => <div key={setting.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm"><span>{data.products.find((product) => product.id === setting.productId)?.name ?? `Artigo #${setting.productId}`}</span><div className="flex items-center gap-1"><span className="mr-2 text-slate-600">{setting.batchSize} un. · {humanMinutes(setting.preparationTimeSeconds)}</span><Button size="icon-xs" variant="ghost" onClick={() => openTimeEditor(setting)} aria-label="Editar tempo de fritura"><Pencil /></Button><Button size="icon-xs" variant="ghost" onClick={() => removeTime(setting)} disabled={deleteTime.isPending} aria-label="Excluir tempo de fritura"><Trash2 className="text-destructive" /></Button></div></div>) : <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">Sem tempos configurados.</p>}</div>
      </article>;
    })}</div> : <EmptyState title="Ainda não existem cubas nesta loja" description="Adicione uma cuba e depois atribua os tempos de fritura aos artigos." />)}
    {slotDialog ? <Modal title={editingSlot ? "Editar cuba" : cloneFrom ? "Clonar cuba" : "Adicionar cuba"} onClose={closeSlotDialog}><form className="space-y-4" onSubmit={submitSlot}><label className="block space-y-1.5 text-sm font-medium">Título da cuba<Input autoFocus value={slotName} onChange={(event) => setSlotName(event.target.value)} placeholder="Ex.: Cuba 1" /></label><label className="block space-y-1.5 text-sm font-medium">Tempo de aquecimento (minutos)<Input type="number" min="0" max="1440" step="0.1" value={heatingMinutes} onChange={(event) => setHeatingMinutes(event.target.value)} /><span className="block text-xs font-normal text-slate-500">Incluído na primeira fritura e após 15 minutos sem fritar.</span></label>{!editingSlot && data?.slots.length ? <label className="block space-y-1.5 text-sm font-medium">Clonar tempos de fritura (opcional)<select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={cloneFrom ?? ""} onChange={(event) => { const source = data.slots.find((slot) => slot.id === Number(event.target.value)); setCloneFrom(event.target.value ? Number(event.target.value) : undefined); if (source) setHeatingMinutes(String(source.heatingTimeSeconds / 60)); }}><option value="">Não clonar</option>{data.slots.map((slot) => <option key={slot.id} value={slot.id}>{slot.name}</option>)}</select></label> : null}<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={closeSlotDialog}>Cancelar</Button><Button type="submit" disabled={slotSaving}>{slotSaving ? "A guardar…" : editingSlot ? "Guardar alterações" : cloneFrom ? "Clonar cuba" : "Adicionar cuba"}</Button></div></form></Modal> : null}
    {timeSlot ? <Modal title={editingTime ? "Editar tempo de fritura" : "Adicionar tempo de fritura"} onClose={closeTimeDialog}><form className="space-y-4" onSubmit={submitTime}><label className="block space-y-1.5 text-sm font-medium">Artigo<select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60" value={productId} onChange={(event) => setProductId(Number(event.target.value))} disabled={Boolean(editingTime)}>{data?.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><div className="grid grid-cols-2 gap-3"><label className="space-y-1.5 text-sm font-medium">Unidades por fritura<Input type="number" min="1" value={batch} onChange={(event) => setBatch(event.target.value)} /></label><label className="space-y-1.5 text-sm font-medium">Tempo (minutos)<Input type="number" min="0.1" step="0.1" value={prepMinutes} onChange={(event) => setPrepMinutes(event.target.value)} /></label></div><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={closeTimeDialog}>Cancelar</Button><Button type="submit" disabled={timeSaving}>{timeSaving ? "A guardar…" : editingTime ? "Guardar alterações" : "Guardar tempo"}</Button></div></form></Modal> : null}
  </div>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-label={title}><section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-xl font-semibold text-slate-950">{title}</h2><Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Fechar">×</Button></div>{children}</section></div>;
}
