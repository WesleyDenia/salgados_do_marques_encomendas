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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  useOrderProducts,
  useOrderSettings,
  useOrderStores,
} from "@/features/orders/hooks/use-order-queries";
import {
  useCreateOrder,
  useUpdateOrder,
} from "@/features/orders/hooks/use-order-mutations";
import { useSlotCapacities } from "@/features/slots/hooks/use-slot-capacity";
import { validateSlotSelection } from "@/features/slots/slot-validation";
import {
  OrderCreateSchema,
  type NormalizedOrderCreateInput,
} from "@/features/orders/schemas/order-schemas";
import {
  ORDER_PAYMENT_STATUS_LABELS,
  ORDER_PAYMENT_STATUSES,
  ORDER_SLOT_LABELS,
  ORDER_SLOT_OPTIONS,
  type Order,
} from "@/features/orders/types";
import {
  getDateInputValueInTimeZone,
  getTimeInputValueInTimeZone,
} from "@/features/orders/utils/operational-timezone";
import type { ApiError } from "@/types/api";
import type { Path, UseFormSetError } from "react-hook-form";

type OrderFormInput = NormalizedOrderCreateInput;
type OrderFormValues = NormalizedOrderCreateInput;

const EMPTY_PRODUCTS: Array<{
  id: number;
  name: string;
}> = [];

const defaultValues: OrderFormInput = {
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

function buildDefaultValues(
  order?: Order | null,
  timeZone = "Europe/Lisbon",
): OrderFormInput {
  if (!order) {
    return defaultValues;
  }

  return {
    storeId: order.store?.id ?? 0,
    customerName: order.customerName ?? order.user?.name ?? "",
    customerContact: order.customerContact ?? "",
    items:
      order.items.length > 0
        ? order.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            variantId: item.variantId ?? null,
            flavorIds: item.flavorIds ?? [],
          }))
        : defaultValues.items,
    observations: order.notes ?? "",
    date: getDateInputValueInTimeZone(order.scheduledAt, timeZone) || defaultValues.date,
    time: getTimeInputValueInTimeZone(order.scheduledAt, timeZone),
    slot: order.slot ?? "manha",
    paymentStatus: order.paymentStatus ?? "pending",
  };
}

const resolveOrderForm =
  zodResolver as unknown as (
    schema: typeof OrderCreateSchema,
  ) => Resolver<OrderFormInput, unknown, OrderFormValues>;

function FieldMessage({ error }: Readonly<{ error?: { message?: string } }>) {
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

export function mapBackendErrorsToForm(
  error: ApiError,
  setError: UseFormSetError<OrderFormValues>,
) {
  if (error.validationErrors?.store_id?.[0]) {
    setError("storeId", {
      type: "server",
      message: error.validationErrors.store_id[0],
    });
  }

  if (error.validationErrors?.customer_name?.[0]) {
    setError("customerName", {
      type: "server",
      message: error.validationErrors.customer_name[0],
    });
  }

  if (error.validationErrors?.customer_contact?.[0]) {
    setError("customerContact", {
      type: "server",
      message: error.validationErrors.customer_contact[0],
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

  if (error.validationErrors?.slot?.[0]) {
    setError("slot", {
      type: "server",
      message: error.validationErrors.slot[0],
    });
  }

  if (error.validationErrors?.payment_status?.[0]) {
    setError("paymentStatus", {
      type: "server",
      message: error.validationErrors.payment_status[0],
    });
  }

  if (error.validationErrors?.items?.[0]) {
    setError("items", {
      type: "server",
      message: error.validationErrors.items[0],
    });
  }

  Object.entries(error.validationErrors ?? {}).forEach(([key, messages]) => {
    if (!messages || messages.length === 0) return;

    const match = key.match(/^items\.(\d+)\.(product_id|quantity)$/);
    if (match) {
      const index = Number(match[1]);
      const fieldName = match[2] === "product_id" ? "productId" : "quantity";
      setError(`items.${index}.${fieldName}` as Path<OrderFormInput>, {
        type: "server",
        message: messages[0],
      });
    }
  });
}

export function OrderComposerDrawer({
  open,
  onOpenChange,
  mode = "create",
  initialOrder = null,
  onSuccess,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "create" | "edit";
  initialOrder?: Order | null;
  onSuccess?: () => void;
}>) {
  const { toast } = useToast();
  const createOrderMutation = useCreateOrder();
  const updateOrderMutation = useUpdateOrder();
  const productsQuery = useOrderProducts();
  const settingsQuery = useOrderSettings();
  const storesQuery = useOrderStores();
  const operationalTimeZone = settingsQuery.data?.timezone ?? "Europe/Lisbon";
  
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setError,
    setValue,
    watch,
  } = useForm<OrderFormInput, unknown, OrderFormValues>({
    resolver: resolveOrderForm(OrderCreateSchema),
    defaultValues: buildDefaultValues(initialOrder, operationalTimeZone),
    mode: "onChange",
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
  const date = watch("date");

  const slotCapacitiesQuery = useSlotCapacities({ storeId, date });
  const slotCapacities = slotCapacitiesQuery.data?.data.slots ?? [];
  const submitMutation = mode === "edit" ? updateOrderMutation : createOrderMutation;

  React.useEffect(() => {
    if (!open) {
      return;
    }

    reset(buildDefaultValues(initialOrder, operationalTimeZone));
  }, [initialOrder, open, operationalTimeZone, reset]);

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
    const slotValidationError = validateSlotSelection(values.slot, slotCapacities);
    if (slotValidationError) {
      setError("slot", {
        type: "manual",
        message: slotValidationError,
      });
      return;
    }

    const mutationOptions = {
      onSuccess: () => {
        toast(
          mode === "edit"
            ? "Encomenda atualizada para correção."
            : "Encomenda criada e enviada para o registo operacional.",
          "success",
        );
        reset(defaultValues);
        onOpenChange(false);
        onSuccess?.();
      },
      onError: (error: ApiError) => {
        const validationMessage = getFirstValidationMessage(error);

        mapBackendErrorsToForm(error, setError);

        toast(
          validationMessage ||
            error.message ||
            (mode === "edit"
              ? "Não foi possível atualizar a encomenda."
              : "Não foi possível criar a encomenda."),
          "error",
        );
      },
    };

    if (mode === "edit" && initialOrder) {
      updateOrderMutation.mutate(
        {
          orderId: initialOrder.id,
          input: values,
          timeZone: operationalTimeZone,
        },
        mutationOptions,
      );

      return;
    }

    createOrderMutation.mutate(
      {
        input: values,
        timeZone: operationalTimeZone,
      },
      mutationOptions,
    );
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <div className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4">
          <SheetHeader>
            <SheetTitle>
              {mode === "edit" ? "Corrigir encomenda" : "Nova encomenda"}
            </SheetTitle>
            <SheetDescription>
              {mode === "edit"
                ? "Revise e corrija os dados operacionais antes de voltar ao registo."
                : "Registo rápido com dados essenciais para atendimento."}
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
                  <SelectTrigger aria-invalid={Boolean(errors.storeId)}>
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
                        <SelectTrigger id={`items.${index}.productId`} aria-invalid={Boolean(errors.items?.[index]?.productId)}>
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
                  <SelectTrigger aria-invalid={Boolean(errors.slot)}>
                    <SelectValue placeholder="Selecionar slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_SLOT_OPTIONS.map((option) => {
                      const capacity = slotCapacities.find((c) => c.slot === option);
                      return (
                        <SelectItem key={option} value={option} disabled={capacity?.state === "bloqueado"}>
                          <div className="flex items-center justify-between w-full gap-3">
                            <span>{ORDER_SLOT_LABELS[option]}</span>
                            {capacity?.state === "disponível" && (
                              <span className="text-[10px] uppercase tracking-wider font-semibold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded ml-auto">Disponível</span>
                            )}
                            {capacity?.state === "limitado" && (
                              <span className="text-[10px] uppercase tracking-wider font-semibold text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded ml-auto">Limitado</span>
                            )}
                            {capacity?.state === "bloqueado" && (
                              <span className="text-[10px] uppercase tracking-wider font-semibold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded ml-auto">Bloqueado</span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
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
                  <SelectTrigger aria-invalid={Boolean(errors.paymentStatus)}>
                    <SelectValue placeholder="Selecionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_PAYMENT_STATUSES.map((option) => (
                      <SelectItem key={option} value={option}>
                        {ORDER_PAYMENT_STATUS_LABELS[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldMessage error={errors.paymentStatus} />
              </div>
            </section>

            <section className="space-y-2">
              <label className="text-sm font-medium" htmlFor="observations">
                Observações
              </label>
              <Textarea
                id="observations"
                className="min-h-24"
                aria-invalid={Boolean(errors.observations)}
                {...register("observations")}
              />
            </section>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-border/70 px-5 py-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                submitMutation.isPending ||
                products.length === 0 ||
                !stores?.length
              }
            >
              {submitMutation.isPending
                ? "A guardar..."
                : mode === "edit"
                  ? "Guardar correção"
                  : "Guardar encomenda"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
