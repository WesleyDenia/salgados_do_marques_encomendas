"use client";

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function OrderSearch({
  value,
  onChange,
  onSubmit,
  onClear,
  loading,
  label = "Pesquisar encomenda existente",
  placeholder = "Pesquisar por nº da encomenda, cliente ou contacto",
  helpTextIdle = "Use critérios operacionais relevantes para localizar rapidamente a encomenda certa.",
  helpTextLoading = "A procurar encomendas no backend...",
}: Readonly<{
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  loading?: boolean;
  label?: string;
  placeholder?: string;
  helpTextIdle?: string;
  helpTextLoading?: string;
}>) {
  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label
        htmlFor="orders-search"
        className="text-sm font-medium text-foreground"
      >
        {label}
      </label>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="orders-search"
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className="pl-9"
            aria-describedby="orders-search-help"
          />
        </div>
        <Button type="submit" disabled={loading}>
          <Search className="size-4" />
          Buscar
        </Button>
        {value.trim() ? (
          <Button type="button" variant="outline" onClick={onClear}>
            <X className="size-4" />
            Limpar
          </Button>
        ) : null}
      </div>
      <p id="orders-search-help" className="text-xs leading-5 text-muted-foreground">
        {loading ? helpTextLoading : helpTextIdle}
      </p>
    </form>
  );
}
