"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Pencil, Trash2, X } from "lucide-react";
import { type Resolver, useFieldArray, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  mapBackendErrorsToForm,
} from "@/features/orders/components/order-composer-drawer";
import {
  useCreateOrder,
  useUpdateOrder,
} from "@/features/orders/hooks/use-order-mutations";
import {
  useOrderDetail,
  useOrderProducts,
  useOrderProductDetail,
  useOrderSettings,
  useOrderStores,
} from "@/features/orders/hooks/use-order-queries";
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
  type OrderFlavorOption,
  type OrderProductOption,
  type OrderProductVariantOption,
  type OrderTag,
} from "@/features/orders/types";
import {
  useSlotCapacities,
} from "@/features/slots/hooks/use-slot-capacity";
import { validateSlotSelection } from "@/features/slots/slot-validation";
import {
  getDateInputValueInTimeZone,
  getTimeInputValueInTimeZone,
} from "@/features/orders/utils/operational-timezone";
import type { ApiError } from "@/types/api";

type OrderFormInput = NormalizedOrderCreateInput;
type OrderFormValues = NormalizedOrderCreateInput;

type ItemConfigState = {
  flavorCounts: Record<number, number>;
  itemIndex: number | null;
  product: OrderProductOption;
  quantity: number;
  variantId: number | null;
};

const defaultValues: OrderFormValues = {
  storeId: 0,
  customerName: "",
  customerContact: "",
  tagIds: [],
  items: [],
  observations: "",
  date: format(new Date(), "yyyy-MM-dd"),
  time: "",
  allowScheduleException: false,
  slot: "manha",
  paymentStatus: "pending",
};

function buildDefaultValues(
  order?: Order | null,
  timeZone = "Europe/Lisbon",
): OrderFormValues {
  if (!order) {
    return defaultValues;
  }

  return {
    storeId: order.store?.id ?? 0,
    customerName: order.customerName ?? order.user?.name ?? "",
    customerContact: order.customerContact ?? "",
    tagIds: order.tags.map((tag) => tag.id),
    items: order.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      variantId: item.variantId ?? null,
      flavorIds: item.flavorIds ?? [],
    })),
    observations: order.notes ?? "",
    date: getDateInputValueInTimeZone(order.scheduledAt, timeZone) || defaultValues.date,
    time: getTimeInputValueInTimeZone(order.scheduledAt, timeZone),
    allowScheduleException: false,
    slot: order.slot ?? "manha",
    paymentStatus: order.paymentStatus ?? "pending",
  };
}

const resolveOrderForm =
  zodResolver as unknown as (
    schema: typeof OrderCreateSchema,
  ) => Resolver<OrderFormInput, unknown, OrderFormValues>;

function FieldMessage({ message }: Readonly<{ message?: string }>) {
  if (!message) {
    return null;
  }

  return <p className="text-xs font-medium text-destructive">{message}</p>;
}

function getFirstValidationMessage(error: ApiError) {
  const entry = Object.values(error.validationErrors ?? {}).find(
    (messages) => messages.length > 0,
  );

  return entry?.[0] ?? null;
}

function buildFlavorCountsFromIds(flavorIds?: number[]) {
  return (flavorIds ?? []).reduce<Record<number, number>>((accumulator, flavorId) => {
    accumulator[flavorId] = (accumulator[flavorId] ?? 0) + 1;
    return accumulator;
  }, {});
}

function buildFlavorIdsFromCounts(flavorCounts: Record<number, number>) {
  return Object.entries(flavorCounts).flatMap(([flavorId, quantity]) =>
    Array.from({ length: quantity }, () => Number(flavorId)),
  );
}

function getActiveVariants(product: OrderProductOption) {
  return [...(product.variants ?? [])]
    .filter((variant) => variant.active)
    .sort((left, right) => left.displayOrder - right.displayOrder);
}

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function buildTagTextColor(color: string) {
  const normalized = color.replace("#", "");
  if (normalized.length !== 6) {
    return "#111827";
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.65 ? "#111827" : "#FFFFFF";
}

function buildItemTitle(
  item: OrderFormValues["items"][number],
  product?: OrderProductOption,
  variant?: OrderProductVariantOption | null,
) {
  if (!product) {
    return `Artigo #${item.productId}`;
  }

  if (variant) {
    return `${product.name} • ${variant.name}`;
  }

  return product.name;
}

function buildFlavorSummary(
  flavorIds: number[] | undefined,
  allowedFlavors: OrderFlavorOption[] | undefined,
) {
  if (!flavorIds?.length) {
    return null;
  }

  const counts = buildFlavorCountsFromIds(flavorIds);

  return Object.entries(counts)
    .map(([flavorId, quantity]) => {
      const label =
        allowedFlavors?.find((flavor) => flavor.id === Number(flavorId))?.name ??
        `Sabor #${flavorId}`;

      return `${label} (${quantity})`;
    })
    .join(", ");
}

function ItemConfigModal({
  state,
  onCancel,
  onConfirm,
}: Readonly<{
  state: ItemConfigState;
  onCancel: () => void;
  onConfirm: (nextState: ItemConfigState) => void;
}>) {
  const productQuery = useOrderProductDetail(state.product.id);
  const product = productQuery.data ?? state.product;
  const [quantity, setQuantity] = React.useState(state.quantity);
  const [variantId, setVariantId] = React.useState<number | null>(state.variantId);
  const [flavorCounts, setFlavorCounts] = React.useState<Record<number, number>>(
    state.flavorCounts,
  );

  const variants = React.useMemo(() => getActiveVariants(product), [product]);
  const selectedVariant =
    variants.find((variant) => variant.id === variantId) ?? variants[0] ?? null;
  const allowedFlavors = product.allowedFlavors ?? [];
  const maxFlavors = selectedVariant?.maxFlavors ?? 0;
  const totalFlavorCount = Object.values(flavorCounts).reduce(
    (total, current) => total + current,
    0,
  );
  const flavorSelectionReady =
    !selectedVariant || maxFlavors <= 0 || totalFlavorCount === maxFlavors;

  React.useEffect(() => {
    if (variants.length === 0) {
      setVariantId(null);
      return;
    }

    if (variantId == null) {
      setVariantId(variants[0]?.id ?? null);
    }
  }, [variantId, variants]);

  function handleVariantChange(nextVariantId: number) {
    setVariantId(nextVariantId);
    setFlavorCounts({});
  }

  function handleFlavorChange(flavorId: number, nextValue: number) {
    const safeValue = Math.max(0, nextValue);
    const current = flavorCounts[flavorId] ?? 0;
    const nextTotal = totalFlavorCount - current + safeValue;

    if (selectedVariant && maxFlavors > 0 && nextTotal > maxFlavors) {
      return;
    }

    setFlavorCounts((currentCounts) => ({
      ...currentCounts,
      [flavorId]: safeValue,
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">
              Configurar item
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              {product.name}
              {productQuery.isFetching ? " · a carregar configuração..." : ""}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onCancel}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <section className="space-y-2">
            <label className="text-sm font-medium text-slate-950" htmlFor="item-quantity">
              Quantidade
            </label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                className="min-h-12 min-w-12 rounded-2xl px-0"
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              >
                -
              </Button>
              <Input
                id="item-quantity"
                inputMode="numeric"
                pattern="[0-9]*"
                value={quantity}
                className="h-12 text-center text-base font-semibold"
                onChange={(event) => {
                  const digits = event.currentTarget.value.replace(/\D/g, "");
                  setQuantity(Math.max(1, Number(digits || "1")));
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="min-h-12 min-w-12 rounded-2xl px-0"
                onClick={() => setQuantity((current) => current + 1)}
              >
                +
              </Button>
            </div>
          </section>

          {variants.length > 0 ? (
            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Escolha o pack
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Selecione o tamanho do pack antes de escolher os sabores.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {variants.map((variant) => {
                  const active = selectedVariant?.id === variant.id;

                  return (
                    <button
                      key={variant.id}
                      type="button"
                      className={`rounded-2xl border px-4 py-4 text-left transition ${
                        active
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-200 bg-white text-slate-950 hover:border-slate-400"
                      }`}
                      onClick={() => handleVariantChange(variant.id)}
                    >
                      <p className="font-semibold">{variant.name}</p>
                      <p className={active ? "text-sm text-slate-200" : "text-sm text-slate-600"}>
                        {variant.unitCount} unidades • {formatCurrency(variant.price)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {selectedVariant && maxFlavors > 0 ? (
            <section className="space-y-3">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Escolha os sabores
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Selecione exatamente {maxFlavors} unidades de sabor para completar o pack.
                  </p>
                </div>
                <div className="text-sm font-medium text-slate-950">
                  {totalFlavorCount} de {maxFlavors}
                </div>
              </div>

              <div className="space-y-3">
                {allowedFlavors.map((flavor) => (
                  <div
                    key={flavor.id}
                    className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3"
                  >
                    <p className="font-medium text-slate-950">{flavor.name}</p>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() =>
                          handleFlavorChange(flavor.id, (flavorCounts[flavor.id] ?? 0) - 1)
                        }
                      >
                        -
                      </Button>
                      <span className="w-8 text-center text-sm font-medium text-slate-950">
                        {flavorCounts[flavor.id] ?? 0}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() =>
                          handleFlavorChange(flavor.id, (flavorCounts[flavor.id] ?? 0) + 1)
                        }
                      >
                        +
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {allowedFlavors.length === 0 ? (
                <p className="text-sm text-amber-700">
                  Este artigo ainda não tem sabores disponíveis no backend.
                </p>
              ) : null}

              {!flavorSelectionReady ? (
                <p className="text-sm text-slate-600">
                  Faltam {maxFlavors - totalFlavorCount} sabor(es) para completar o pack.
                </p>
              ) : null}
            </section>
          ) : null}
        </div>

        <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-6 py-5 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!flavorSelectionReady || quantity < 1}
            onClick={() =>
              onConfirm({
                ...state,
                flavorCounts,
                product,
                quantity,
                variantId: selectedVariant?.id ?? null,
              })
            }
          >
            Confirmar item
          </Button>
        </div>
      </div>
    </div>
  );
}

export function OrderComposerPage({
  mode = "create",
  orderId,
  initialOrder = null,
}: Readonly<{
  mode?: "create" | "edit";
  orderId?: number | string | null;
  initialOrder?: Order | null;
}>) {
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = React.useState<1 | 2>(1);
  const [itemConfigState, setItemConfigState] = React.useState<ItemConfigState | null>(
    null,
  );
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(null);
  const [canScrollCategoriesLeft, setCanScrollCategoriesLeft] = React.useState(false);
  const [canScrollCategoriesRight, setCanScrollCategoriesRight] = React.useState(false);
  const categoryTabsRef = React.useRef<HTMLDivElement | null>(null);

  const createOrderMutation = useCreateOrder();
  const updateOrderMutation = useUpdateOrder();
  const productsQuery = useOrderProducts();
  const settingsQuery = useOrderSettings();
  const storesQuery = useOrderStores();
  const operationalTimeZone = settingsQuery.data?.timezone ?? "Europe/Lisbon";
  const initialOrderQuery = useOrderDetail(
    mode === "edit" ? (orderId ?? initialOrder?.id ?? null) : null,
  );
  const resolvedInitialOrder = initialOrderQuery.data ?? initialOrder ?? null;

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
    defaultValues: buildDefaultValues(resolvedInitialOrder, operationalTimeZone),
    mode: "onChange",
    resolver: resolveOrderForm(OrderCreateSchema),
  });

  const { append, fields, remove, update } = useFieldArray({
    control,
    name: "items",
  });

  const products = React.useMemo(
    () =>
      (productsQuery.data?.data ?? [])
        .filter((product) => product.active)
        .sort((left, right) => left.name.localeCompare(right.name, "pt-PT")),
    [productsQuery.data?.data],
  );
  const productCategories = React.useMemo(() => {
    const categories = new Map<
      string,
      {
        id: string;
        label: string;
        order: number;
        count: number;
      }
    >();

    products.forEach((product) => {
      const id = product.category?.id != null ? String(product.category.id) : "uncategorized";
      const label = product.category?.name?.trim() || "Sem categoria";
      const order = product.category?.order ?? Number.MAX_SAFE_INTEGER;
      const current = categories.get(id);

      if (current) {
        current.count += 1;
        return;
      }

      categories.set(id, {
        id,
        label,
        order,
        count: 1,
      });
    });

    return [...categories.values()].sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order;
      }

      return left.label.localeCompare(right.label, "pt-PT");
    });
  }, [products]);
  const stores = React.useMemo(() => storesQuery.data?.data ?? [], [storesQuery.data?.data]);
  const availableTags = React.useMemo(
    () => settingsQuery.data?.availableTags ?? [],
    [settingsQuery.data?.availableTags],
  );
  const filteredProducts = React.useMemo(() => {
    if (!selectedCategoryId) {
      return [];
    }

    return products.filter((product) => {
      const productCategoryId =
        product.category?.id != null ? String(product.category.id) : "uncategorized";

      return productCategoryId === selectedCategoryId;
    });
  }, [products, selectedCategoryId]);
  const items = watch("items");
  const storeId = watch("storeId");
  const tagIds = watch("tagIds");
  const slot = watch("slot");
  const paymentStatus = watch("paymentStatus");
  const date = watch("date");
  const allowScheduleException = watch("allowScheduleException");
  const slotCapacitiesQuery = useSlotCapacities({ date, storeId });
  const slotCapacities = slotCapacitiesQuery.data?.data.slots ?? [];
  const selectedTags = React.useMemo(
    () =>
      availableTags.filter((tag) => tagIds.includes(tag.id)),
    [availableTags, tagIds],
  );

  React.useEffect(() => {
    if (mode !== "edit") {
      return;
    }

    if (initialOrderQuery.isLoading && !resolvedInitialOrder) {
      return;
    }

    reset(buildDefaultValues(resolvedInitialOrder, operationalTimeZone));
  }, [
    initialOrderQuery.isLoading,
    mode,
    operationalTimeZone,
    reset,
    resolvedInitialOrder,
  ]);

  React.useEffect(() => {
    if (storeId > 0 || stores.length === 0) {
      return;
    }

    const preferredStore = stores.find((store) => store.defaultStore) ?? stores[0];

    if (preferredStore) {
      setValue("storeId", preferredStore.id, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [setValue, storeId, stores]);

  React.useEffect(() => {
    if (selectedCategoryId || productCategories.length === 0) {
      return;
    }

    setSelectedCategoryId(productCategories[0]?.id ?? null);
  }, [productCategories, selectedCategoryId]);

  const updateCategoryScrollState = React.useCallback(() => {
    const container = categoryTabsRef.current;

    if (!container) {
      setCanScrollCategoriesLeft(false);
      setCanScrollCategoriesRight(false);
      return;
    }

    setCanScrollCategoriesLeft(container.scrollLeft > 4);
    setCanScrollCategoriesRight(
      container.scrollLeft + container.clientWidth < container.scrollWidth - 4,
    );
  }, []);

  React.useEffect(() => {
    updateCategoryScrollState();
  }, [productCategories, selectedCategoryId, updateCategoryScrollState]);

  React.useEffect(() => {
    const container = categoryTabsRef.current;

    if (!container) {
      return;
    }

    const handleScroll = () => updateCategoryScrollState();

    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [updateCategoryScrollState]);

  React.useEffect(() => {
    const container = categoryTabsRef.current;

    if (!container || !selectedCategoryId) {
      return;
    }

    const activeTab = container.querySelector<HTMLButtonElement>(
      `[data-category-tab="${selectedCategoryId}"]`,
    );

    activeTab?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [selectedCategoryId]);

  function scrollCategoryTabs(direction: "left" | "right") {
    const container = categoryTabsRef.current;

    if (!container) {
      return;
    }

    const amount = Math.max(container.clientWidth * 0.7, 160);

    container.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }

  function openCreateItem(product: OrderProductOption) {
    const defaultVariant = getActiveVariants(product)[0] ?? null;

    setItemConfigState({
      flavorCounts: {},
      itemIndex: null,
      product,
      quantity: 1,
      variantId: defaultVariant?.id ?? null,
    });
  }

  function openEditItem(index: number) {
    const existingItem = items[index];

    if (!existingItem) {
      return;
    }

    const product = products.find((entry) => entry.id === existingItem.productId);

    if (!product) {
      return;
    }

    setItemConfigState({
      flavorCounts: buildFlavorCountsFromIds(existingItem.flavorIds),
      itemIndex: index,
      product,
      quantity: existingItem.quantity,
      variantId: existingItem.variantId ?? null,
    });
  }

  function handleConfirmItem(config: ItemConfigState) {
    const flavorIds = buildFlavorIdsFromCounts(config.flavorCounts);
    const nextItem = {
      flavorIds,
      productId: config.product.id,
      quantity: config.quantity,
      variantId: config.variantId,
    };

    if (config.itemIndex === null) {
      append(nextItem);
    } else {
      update(config.itemIndex, nextItem);
    }

    setItemConfigState(null);
  }

  function goToStepTwo() {
    if (items.length === 0) {
      setError("items", {
        message: "Adicione pelo menos um item a encomenda.",
        type: "manual",
      });
      return;
    }

    setCurrentStep(2);
  }

  const submitOrder = handleSubmit((values) => {
    const slotValidationError = validateSlotSelection(values.slot, slotCapacities);

    if (slotValidationError) {
      setError("slot", {
        message: slotValidationError,
        type: "manual",
      });
      return;
    }

    const onError = (error: ApiError) => {
      mapBackendErrorsToForm(error, setError);
      toast(
        getFirstValidationMessage(error) ??
          error.message ??
          (mode === "edit"
            ? "Não foi possível atualizar a encomenda."
            : "Não foi possível criar a encomenda."),
        "error",
      );
    };

    const onSuccess = () => {
      toast(
        mode === "edit"
          ? "Encomenda atualizada no registo operacional."
          : "Encomenda criada e enviada para o registo operacional.",
        "success",
      );
      router.push("/orders");
      router.refresh();
    };

    if (mode === "edit" && resolvedInitialOrder) {
      updateOrderMutation.mutate(
        {
          orderId: resolvedInitialOrder.id,
          input: values,
          timeZone: operationalTimeZone,
        },
        {
          onError,
          onSuccess,
        },
      );

      return;
    }

    createOrderMutation.mutate(
      {
        input: values,
        timeZone: operationalTimeZone,
      },
      {
        onError,
        onSuccess,
      },
    );
  });

  const isSubmitting =
    createOrderMutation.isPending || updateOrderMutation.isPending;

  const toggleTagSelection = React.useCallback(
    (tag: OrderTag) => {
      const isSelected = tagIds.includes(tag.id);

      if (!tag.active && !isSelected) {
        return;
      }

      setValue(
        "tagIds",
        isSelected
          ? tagIds.filter((tagId) => tagId !== tag.id)
          : [...tagIds, tag.id],
        {
          shouldDirty: true,
          shouldValidate: true,
        },
      );
    },
    [setValue, tagIds],
  );

  if (mode === "edit" && initialOrderQuery.isLoading && !resolvedInitialOrder) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
        A carregar a encomenda para correção...
      </section>
    );
  }

  if (mode === "edit" && initialOrderQuery.error && !resolvedInitialOrder) {
    return (
      <section className="rounded-3xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive shadow-sm">
        Não foi possível carregar a encomenda para edição.
      </section>
    );
  }

  return (
    <>
      <form onSubmit={submitOrder} className="space-y-6">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(24rem,1fr)]">
          <div className="space-y-6">
            {currentStep === 1 ? (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex justify-end">
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      className="min-h-10 rounded-xl px-4"
                    >
                      Step 1
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="min-h-10 rounded-xl px-4"
                      onClick={goToStepTwo}
                    >
                      Step 2
                    </Button>
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950/95">
                  <div className="flex items-stretch">
                    <div
                      ref={categoryTabsRef}
                      className="flex min-w-0 flex-1 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    >
                      {productCategories.map((category) => {
                        const active = selectedCategoryId === category.id;

                        return (
                          <button
                            key={category.id}
                            data-category-tab={category.id}
                            type="button"
                            className={`shrink-0 border-r border-white/10 px-5 py-4 text-left transition ${
                              active
                                ? "bg-white text-slate-950"
                                : "bg-gray-500/90 text-white hover:bg-gray-400"
                            }`}
                            onClick={() => setSelectedCategoryId(category.id)}
                          >
                            <p className="whitespace-nowrap text-base font-medium">
                              {category.label}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex shrink-0 border-l border-white/10 bg-slate-800/90">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-auto rounded-none px-3 text-white hover:bg-white/10 hover:text-white disabled:opacity-35"
                        disabled={!canScrollCategoriesLeft}
                        onClick={() => scrollCategoryTabs("left")}
                      >
                        <ChevronLeft className="size-5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-auto rounded-none border-l border-white/10 px-3 text-white hover:bg-white/10 hover:text-white disabled:opacity-35"
                        disabled={!canScrollCategoriesRight}
                        onClick={() => scrollCategoryTabs("right")}
                      >
                        <ChevronRight className="size-5" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-3xl border border-slate-300 bg-slate-200/70 p-4 shadow-inner shadow-slate-300/40">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {filteredProducts.map((product) => {
                      const hasVariants = getActiveVariants(product).length > 0;

                      return (
                        <article
                          key={product.id}
                          className="flex flex-col justify-between rounded-2xl border border-slate-300 bg-white p-4 shadow-[0_16px_35px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-[0_22px_45px_rgba(15,23,42,0.12)]"
                        >
                          <div>
                            <p className="font-semibold text-slate-950">{product.name}</p>
                            <p className="mt-1 text-sm text-slate-600">
                              {product.description?.trim() || "Sem descrição disponível."}
                            </p>
                            <p className="mt-2 text-sm font-medium text-slate-950">
                              {hasVariants
                                ? "Disponível em packs configuráveis"
                                : formatCurrency(product.price)}
                            </p>
                          </div>

                          <Button
                            type="button"
                            className="mt-4 bg-slate-950 text-white hover:bg-slate-800"
                            onClick={() => openCreateItem(product)}
                          >
                            {hasVariants ? "Escolher pack e sabores" : "Configurar item"}
                          </Button>
                        </article>
                      );
                    })}
                  </div>

                  {selectedCategoryId && filteredProducts.length === 0 ? (
                    <div className="mt-5 rounded-2xl border border-dashed border-slate-400 bg-white/95 p-5 text-sm text-slate-600">
                      Não há artigos disponíveis nesta categoria.
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 space-y-3">
                  {fields.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-5 text-sm text-slate-600">
                      Ainda não há itens na encomenda. Selecione uma categoria e adicione o primeiro artigo.
                    </div>
                  ) : (
                    fields.map((field, index) => {
                      const item = items[index];
                      const product = products.find((entry) => entry.id === item.productId);
                      const variant =
                        product?.variants?.find((entry) => entry.id === item.variantId) ?? null;
                      const flavorSummary = buildFlavorSummary(
                        item.flavorIds,
                        product?.allowedFlavors,
                      );

                      return (
                        <article
                          key={field.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                        >
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-1">
                              <p className="font-semibold text-slate-950">
                                {buildItemTitle(item, product, variant)}
                              </p>
                              <p className="text-sm text-slate-600">
                                Quantidade: {item.quantity}
                                {variant ? ` • ${variant.unitCount} unidades por pack` : ""}
                              </p>
                              {flavorSummary ? (
                                <p className="text-sm text-slate-600">Sabores: {flavorSummary}</p>
                              ) : null}
                            </div>

                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openEditItem(index)}
                              >
                                <Pencil className="size-4" />
                                Editar
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => remove(index)}
                              >
                                <Trash2 className="size-4" />
                                Remover
                              </Button>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>

                <FieldMessage message={errors.items?.message as string | undefined} />
              </section>
            ) : (
              <>
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex justify-end">
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="min-h-10 rounded-xl px-4"
                        onClick={() => setCurrentStep(1)}
                      >
                        Step 1
                      </Button>
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="min-h-10 rounded-xl px-4"
                      >
                        Step 2
                      </Button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-950">Loja</label>
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
                          {stores.map((store) => (
                            <SelectItem key={store.id} value={String(store.id)}>
                              {store.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldMessage message={errors.storeId?.message} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-950" htmlFor="customerName">
                        Cliente
                      </label>
                      <Input id="customerName" autoComplete="name" {...register("customerName")} />
                      <FieldMessage message={errors.customerName?.message} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-950" htmlFor="customerContact">
                        Contacto
                      </label>
                      <Input id="customerContact" autoComplete="tel" {...register("customerContact")} />
                      <FieldMessage message={errors.customerContact?.message} />
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-950">Tags operacionais</label>
                      <p className="text-sm text-slate-600">
                        Classifique já a encomenda para facilitar triagem, prioridade e filtros na fila operacional.
                      </p>
                    </div>

                    {availableTags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {availableTags.map((tag) => {
                          const isSelected = tagIds.includes(tag.id);
                          const isSelectable = tag.active || isSelected;

                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => toggleTagSelection(tag)}
                              disabled={!isSelectable}
                              className="inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
                              style={{
                                backgroundColor: isSelected ? tag.color : "#FFFFFF",
                                borderColor: tag.color,
                                color: isSelected ? buildTagTextColor(tag.color) : "#0F172A",
                              }}
                            >
                              <span
                                className="inline-flex h-2.5 w-2.5 rounded-full"
                                style={{
                                  backgroundColor: isSelected ? buildTagTextColor(tag.color) : tag.color,
                                }}
                                aria-hidden
                              />
                              {tag.name}
                              {!tag.active ? " · inativa" : ""}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        Ainda não existem tags configuradas em Governação operacional.
                      </p>
                    )}
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Agendamento
                    </p>
                    <p className="text-sm text-slate-600">
                      Defina quando a encomenda será retirada e qual o estado inicial do pagamento.
                    </p>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-950" htmlFor="date">
                        Data
                      </label>
                      <Input id="date" type="date" {...register("date")} />
                      <FieldMessage message={errors.date?.message} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-950" htmlFor="time">
                        Hora
                      </label>
                      <Input id="time" type="time" {...register("time")} />
                      <FieldMessage message={errors.time?.message} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-950">Slot</label>
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
                            const capacity = slotCapacities.find((entry) => entry.slot === option);

                            return (
                              <SelectItem
                                key={option}
                                value={option}
                                disabled={capacity?.state === "bloqueado"}
                              >
                                {ORDER_SLOT_LABELS[option]}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FieldMessage message={errors.slot?.message} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-950">
                        Estado de pagamento
                      </label>
                      <Select
                        value={paymentStatus}
                        onValueChange={(value) =>
                          setValue("paymentStatus", value as OrderFormValues["paymentStatus"], {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
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
                      <FieldMessage message={errors.paymentStatus?.message} />
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-slate-300"
                        checked={allowScheduleException}
                        onChange={(event) =>
                          setValue("allowScheduleException", event.currentTarget.checked, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                      />
                      <div className="space-y-1">
                        <span className="text-sm font-medium text-slate-950">
                          Permitir exceção fora do horário da loja
                        </span>
                        <p className="text-sm text-slate-600">
                          Use apenas quando a retirada foi alinhada manualmente com a loja. Esta opção ignora o horário de funcionamento, mas mantém as restantes validações operacionais.
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="mt-5 space-y-2">
                    <label className="text-sm font-medium text-slate-950" htmlFor="observations">
                      Observações
                    </label>
                    <Textarea id="observations" className="min-h-28" {...register("observations")} />
                  </div>
                </section>
              </>
            )}
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Resumo da encomenda
                </p>
                <p className="text-sm text-slate-600">
                  Revise os dados antes de guardar no registo operacional.
                </p>
              </div>

              <dl className="mt-5 space-y-4 text-sm">
                <div>
                  <dt className="text-slate-500">Loja</dt>
                  <dd className="font-medium text-slate-950">
                    {stores.find((store) => store.id === storeId)?.name ?? "Por definir"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Cliente</dt>
                  <dd className="font-medium text-slate-950">
                    {watch("customerName") || "Por definir"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Contacto</dt>
                  <dd className="font-medium text-slate-950">
                    {watch("customerContact") || "Por definir"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Itens</dt>
                  <dd className="font-medium text-slate-950">{items.length}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Tags</dt>
                  <dd className="font-medium text-slate-950">
                    {selectedTags.length > 0
                      ? selectedTags.map((tag) => tag.name).join(", ")
                      : "Sem tags"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Agendamento</dt>
                  <dd className="font-medium text-slate-950">
                    {watch("date") && watch("time")
                      ? `${watch("date")} às ${watch("time")}`
                      : "Por definir"}
                  </dd>
                </div>
              </dl>

              {(productsQuery.isLoading || storesQuery.isLoading || settingsQuery.isLoading) ? (
                <p className="mt-5 text-sm text-slate-600">
                  A carregar catálogo, lojas e configurações operacionais...
                </p>
              ) : null}

              {(productsQuery.error || storesQuery.error || settingsQuery.error) ? (
                <p className="mt-5 text-sm text-destructive">
                  Não foi possível carregar todos os dados necessários do backend.
                </p>
              ) : null}

              <div className="mt-6 flex flex-col gap-3">
                {currentStep === 1 ? (
                  <Button type="button" onClick={goToStepTwo} disabled={products.length === 0}>
                    Continuar para Step 2
                  </Button>
                ) : (
                  <>
                    <Button
                      type="submit"
                      disabled={
                        isSubmitting ||
                        products.length === 0 ||
                        storeId <= 0
                      }
                    >
                      {isSubmitting
                        ? "A guardar..."
                        : mode === "edit"
                          ? "Guardar correção"
                          : "Guardar encomenda"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
                      Voltar ao Step 1
                    </Button>
                  </>
                )}
                <Button type="button" variant="outline" onClick={() => router.push("/orders")}>
                  Cancelar
                </Button>
              </div>
            </section>
          </aside>
        </section>
      </form>

      {itemConfigState ? (
        <ItemConfigModal
          state={itemConfigState}
          onCancel={() => setItemConfigState(null)}
          onConfirm={handleConfirmItem}
        />
      ) : null}
    </>
  );
}
