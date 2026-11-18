"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { searchCustomers, type CustomerOption } from "@/features/orders/api";
import { useDebouncedValue } from "@/features/orders/hooks/use-debounced-value";

type CustomerAutocompleteProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (customer: CustomerOption) => void;
  invalid?: boolean;
  disabled?: boolean;
};

export function CustomerAutocomplete({
  id,
  value,
  onChange,
  onSelect,
  invalid = false,
  disabled = false,
}: Readonly<CustomerAutocompleteProps>) {
  const [open, setOpen] = React.useState(false);
  const [results, setResults] = React.useState<CustomerOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const debouncedValue = useDebouncedValue(value.trim(), 250);

  React.useEffect(() => {
    let active = true;

    if (debouncedValue.length < 2) {
      setResults([]);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    void searchCustomers(debouncedValue)
      .then((customers) => {
        if (active) {
          setResults(customers);
        }
      })
      .catch(() => {
        if (active) {
          setResults([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [debouncedValue]);

  const showResults = open && value.trim().length >= 2;

  return (
    <div className="relative">
      <Input
        id={id}
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={`${id}-results`}
        aria-expanded={showResults}
        aria-invalid={invalid}
        disabled={disabled}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          onChange(event.currentTarget.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Pesquisar ou inserir cliente"
        role="combobox"
        value={value}
      />

      {showResults ? (
        <div
          className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-input bg-background py-1 shadow-lg"
          id={`${id}-results`}
          role="listbox"
        >
          {loading ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">A pesquisar clientes…</p>
          ) : results.length > 0 ? (
            results.map((customer) => (
              <button
                className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none"
                key={customer.id}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelect(customer);
                  setOpen(false);
                }}
                aria-selected={false}
                role="option"
                type="button"
              >
                <span className="font-medium text-foreground">{customer.name}</span>
                <span className="text-muted-foreground">
                  {customer.phone ?? "Sem telemóvel registado"}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              Nenhum cliente encontrado. Pode continuar o preenchimento manualmente.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
