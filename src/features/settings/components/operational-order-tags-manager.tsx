"use client";

import * as React from "react";
import { Pencil, Plus, Tag, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  useCreateOperationalOrderTag,
  useOperationalOrderTags,
  useUpdateOperationalOrderTag,
} from "@/features/settings/hooks/use-operational-settings";
import type { OperationalOrderTag } from "@/features/settings/types";

type OrderTagFormState = {
  name: string;
  color: string;
  active: boolean;
};

const defaultFormState: OrderTagFormState = {
  name: "",
  color: "#92400E",
  active: true,
};

function normalizeHexColor(value: string) {
  const trimmed = value.trim();

  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return "#92400E";
}

export function OperationalOrderTagsManager() {
  const { toast } = useToast();
  const tagsQuery = useOperationalOrderTags();
  const createMutation = useCreateOperationalOrderTag();
  const updateMutation = useUpdateOperationalOrderTag();
  const [editingTag, setEditingTag] = React.useState<OperationalOrderTag | null>(null);
  const [formState, setFormState] = React.useState<OrderTagFormState>(defaultFormState);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const resetForm = React.useCallback(() => {
    setEditingTag(null);
    setFormState(defaultFormState);
  }, []);

  const beginEdit = React.useCallback((tag: OperationalOrderTag) => {
    setEditingTag(tag);
    setFormState({
      name: tag.name,
      color: normalizeHexColor(tag.color),
      active: tag.active,
    });
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = formState.name.trim();
    if (!trimmedName) {
      toast("Indique o nome da tag.", "error");
      return;
    }

    const payload = {
      name: trimmedName,
      color: normalizeHexColor(formState.color),
      active: formState.active,
    };

    try {
      if (editingTag) {
        await updateMutation.mutateAsync({
          tagId: editingTag.id,
          payload,
        });
        toast("Tag atualizada com sucesso.", "success");
      } else {
        await createMutation.mutateAsync(payload);
        toast("Tag criada com sucesso.", "success");
      }

      resetForm();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível guardar a tag.";
      toast(message, "error");
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Tag className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-base font-semibold text-foreground">Tags operacionais</h2>
          <p className="text-sm text-muted-foreground">
            Crie e mantenha as tags usadas na triagem e classificação das encomendas.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-border/70 bg-muted/20 p-4 lg:grid-cols-[minmax(0,1.2fr)_140px_140px_auto] lg:items-end">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="order-tag-name">
            Nome da tag
          </label>
          <Input
            id="order-tag-name"
            value={formState.name}
            maxLength={60}
            onChange={(event) => {
              const { value } = event.currentTarget;

              setFormState((current) => ({
                ...current,
                name: value,
              }));
            }}
            placeholder="Ex.: VIP, Urgente, Festa grande"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="order-tag-color">
            Cor
          </label>
          <Input
            id="order-tag-color"
            type="color"
            value={normalizeHexColor(formState.color)}
            onChange={(event) => {
              const { value } = event.currentTarget;

              setFormState((current) => ({
                ...current,
                color: value,
              }));
            }}
            className="h-10 w-full cursor-pointer p-1"
          />
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2">
          <input
            type="checkbox"
            checked={formState.active}
            onChange={(event) => {
              const { checked } = event.currentTarget;

              setFormState((current) => ({
                ...current,
                active: checked,
              }));
            }}
            className="h-4 w-4 rounded border-border"
          />
          <span className="text-sm font-medium text-foreground">Ativa</span>
        </label>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            {editingTag ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isSubmitting
              ? "A guardar..."
              : editingTag
                ? "Guardar tag"
                : "Criar tag"}
          </Button>
          {editingTag ? (
            <Button type="button" variant="outline" onClick={resetForm} className="gap-2">
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          ) : null}
        </div>
      </form>

      {tagsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">A carregar tags operacionais...</p>
      ) : null}

      {tagsQuery.error ? (
        <p className="text-sm text-destructive">
          Não foi possível carregar as tags operacionais.
        </p>
      ) : null}

      {tagsQuery.data && tagsQuery.data.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {tagsQuery.data.map((tag) => (
            <article
              key={tag.id}
              className="rounded-2xl border border-border bg-background p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex h-3 w-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                      aria-hidden
                    />
                    <p className="truncate text-sm font-semibold text-foreground">{tag.name}</p>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {tag.active ? "Disponível no Step 1 da nova encomenda." : "Tag desativada para novas classificações."}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {typeof tag.orders_count === "number"
                      ? `${tag.orders_count} encomenda(s) com esta tag.`
                      : "Sem informação de utilização."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => beginEdit(tag)}
                >
                  Editar
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {tagsQuery.data && tagsQuery.data.length === 0 && !tagsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">
          Ainda não existem tags operacionais criadas.
        </p>
      ) : null}
    </section>
  );
}
