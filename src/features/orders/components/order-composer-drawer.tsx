"use client";

import * as React from "react";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import {
  type FieldError,
  type Resolver,
  useFieldArray,
  useForm,
} from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { useOrderProducts, useOrderStores } from "@/features/orders/hooks/use-order-queries";
import { useCreateOrder } from "@/features/orders/hooks/use-order-mutations";
import {
  OrderCreateSchema,
  type NormalizedOrderCreateInput,
} from "@/features/orders/schemas/order-schemas";
import { ORDER_PAYMENT_STATUSES, ORDER_SLOT_OPTIONS } from "@/features/orders/types";
import type { ApiError } from "@/types/api";

type OrderFormValues = {
  storeId: number;
  customerName: string;
  customerContact: string;
  items: Array<{
    productId: number;
    quantity: number;
  }>;
  observations: string;
  date: string;
  time: string;
  slot: (typeof ORDER_SLOT_OPTIONS)[number];
  paymentStatus: (typeof ORDER_PAYMENT_STATUSES)[number];
};

const EMPTY_PRODUCTS: Array<{
  id: number;
  name: string;
}> = [];

const paymentStatusLabels: Record<OrderFormValues["paymentStatus"], string> = {
  pending: "Pendente",
  partial: "Parcial",
  paid: "Pago",
};

const slotLabels: Record<OrderFormValues["slot"], string> = {
  manha: "Manha",
  tarde: "Tarde",
  noite: "Noite",
};

const defaultValues: OrderFormValues = {
  storeId: 0,
  customerName: "",
  customerContact: "",
  items: [
    {
      productId: 0,
      quantity: 1,
    },
  ],
  observations: "",
  date: format(new Date(), "yyyy-MM-dd"),
  time: "",
  slot: "manha",
  paymentStatus: "pending",
};

const orderFormResolver = zodResolver(OrderCreateSchema as never) as Resolver<
  OrderFormValues,
  unknown,
  NormalizedOrderCreateInput
>;

function FieldMessage({ error }: Readonly<{ error?: FieldError }>) {
  if (!error?.message) {
    return null;
  }

  return <p className="text-xs font-medium text-destructive">{error.message}</p>;
}

function getFirstValidationMessage(error: ApiError) {
  const entry = Object.values(error.validationErrors ?? {}).find(
    (messages) => messages.length > 0,
  );

  return entry?.[0] ?? null;
}

export function OrderComposerDrawer({
  open,
  onOpenChange,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  const { toast } = useToast();
  const createOrderMutation = useCreateOrder();
  const productsQuery = useOrderProducts();
  const storesQuery = useOrderStores();
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setError,
    setValue,
    watch,
  } = useForm<OrderFormValues, unknown, NormalizedOrderCreateInput>({
    resolver: orderFormResolver,
    defaultValues,
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });
  const products = productsQuery.data?.data ?? EMPTY_PRODUCTS;
  const stores = storesQuery.data?.data;
  const storeId = watch("storeId");
  const slot = watch("slot");
  const paymentStatus = watch("paymentStatus");

  React.useEffect(() => {
    if (storeId > 0 || !stores?.length) {
      return;
    }

    const preferredStore =
      stores.find((store) => store.defaultStore) ?? stores[0];

    if (preferredStore) {
      setValue("storeId", preferredStore.id, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [setValue, storeId, stores]);

  const submitOrder = handleSubmit((values) => {
    createOrderMutation.mutate(values, {
      onSuccess: () => {
        toast("Encomenda criada e enviada para o registo operacional.", "success");
        reset(defaultValues);
        onOpenChange(false);
      },
      onError: (error: ApiError) => {
        const validationMessage = getFirstValidationMessage(error);

        if (error.validationErrors?.store_id?.[0]) {
          setError("storeId", {
            type: "server",
            message: error.validationErrors.store_id[0],
          });
        }

        if (error.validationErrors?.scheduled_at?.[0]) {
          setError("date", {
            type: "server",
            message: error.validationErrors.scheduled_at[0],
          });
          setError("time", {
            type: "server",
            message: error.validationErrors.scheduled_at[0],
          });
        }

        if (error.validationErrors?.items?.[0]) {
          setError("items", {
            type: "server",
            message: error.validationErrors.items[0],
          });
        }

        toast(
          validationMessage || error.message || "Nao foi possivel criar a encomenda.",
          "error",
        );
      },
    });
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <div className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4">
          <SheetHeader>
            <SheetTitle>Nova encomenda</SheetTitle>
            <SheetDescription>
              Registo rapido com dados essenciais para atendimento.
            </SheetDescription>
          </SheetHeader>
          <SheetClose />
        </div>

        <form onSubmit={submitOrder} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
            <section className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Loja</label>
                <Select
                  value={storeId > 0 ? String(storeId) : undefined}
                  onValueChange={(value) =>
                    setValue("storeId", Number(value), {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar loja" />
                  </SelectTrigger>
                  <SelectContent>
                    {(stores ?? []).map((store) => (
                      <SelectItem key={store.id} value={String(store.id)}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldMessage error={errors.storeId} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="customerName">
                  Cliente
                </label>
                <Input
                  id="customerName"
                  autoComplete="name"
                  aria-invalid={Boolean(errors.customerName)}
                  {...register("customerName")}
                />
                <FieldMessage error={errors.customerName} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="customerContact">
                  Contacto
                </label>
                <Input
                  id="customerContact"
                  autoComplete="tel"
                  aria-invalid={Boolean(errors.customerContact)}
                  {...register("customerContact")}
                />
                <FieldMessage error={errors.customerContact} />
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Itens
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ productId: 0, quantity: 1 })}
                >
                  <Plus className="size-4" />
                  Adicionar item
                </Button>
              </div>

              <FieldMessage error={errors.items as FieldError | undefined} />

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid gap-3 rounded-lg border border-border/70 bg-card/60 p-3 md:grid-cols-[minmax(0,1.6fr)_7rem_2rem]"
                  >
                    <div className="space-y-2">
                      <label
                        className="text-sm font-medium"
                        htmlFor={`items.${index}.productId`}
                      >
                        Produto
                      </label>
                      <Select
                        value={
                          watch(`items.${index}.productId`) > 0
                            ? String(watch(`items.${index}.productId`))
                            : undefined
                        }
                        onValueChange={(value) =>
                          setValue(`items.${index}.productId`, Number(value), {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                      >
                        <SelectTrigger id={`items.${index}.productId`}>
                          <SelectValue placeholder="Selecionar produto" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={String(product.id)}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldMessage error={errors.items?.[index]?.productId} />
                    </div>

                    <div className="space-y-2">
                      <label
                        className="text-sm font-medium"
                        htmlFor={`items.${index}.quantity`}
                      >
                        Quantidade
                      </label>
                      <Input
                        id={`items.${index}.quantity`}
                        type="number"
                        min={1}
                        aria-invalid={Boolean(errors.items?.[index]?.quantity)}
                        {...register(`items.${index}.quantity`, {
                          valueAsNumber: true,
                        })}
                      />
                      <FieldMessage error={errors.items?.[index]?.quantity} />
                    </div>

                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={fields.length === 1}
                        aria-label="Remover item"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {productsQuery.isLoading || storesQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">
                A carregar catálogo de produtos e lojas disponíveis...
              </p>
            ) : null}

            {productsQuery.error || storesQuery.error ? (
              <p className="text-sm text-destructive">
                Não foi possível carregar o catálogo necessário para criar a
                encomenda no backend.
              </p>
            ) : null}

            <section className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="date">
                  Data
                </label>
                <Input
                  id="date"
                  type="date"
                  aria-invalid={Boolean(errors.date)}
                  {...register("date")}
                />
                <FieldMessage error={errors.date} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="time">
                  Hora
                </label>
                <Input
                  id="time"
                  type="time"
                  aria-invalid={Boolean(errors.time)}
                  {...register("time")}
                />
                <FieldMessage error={errors.time} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Slot</label>
                <Select
                  value={slot}
                  onValueChange={(value) =>
                    setValue("slot", value as OrderFormValues["slot"], {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_SLOT_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {slotLabels[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldMessage error={errors.slot} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Estado de pagamento
                </label>
                <Select
                  value={paymentStatus}
                  onValueChange={(value) =>
                    setValue(
                      "paymentStatus",
                      value as OrderFormValues["paymentStatus"],
                      {
                        shouldDirty: true,
                        shouldValidate: true,
                      },
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_PAYMENT_STATUSES.map((option) => (
                      <SelectItem key={option} value={option}>
                        {paymentStatusLabels[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldMessage error={errors.paymentStatus} />
              </div>
            </section>

            <section className="space-y-2">
              <label className="text-sm font-medium" htmlFor="observations">
                Observacoes
              </label>
              <textarea
                id="observations"
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                {...register("observations")}
              />
            </section>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-border/70 px-5 py-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createOrderMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                createOrderMutation.isPending ||
                products.length === 0 ||
                !stores?.length
              }
            >
              {createOrderMutation.isPending
                ? "A guardar..."
                : "Guardar encomenda"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
