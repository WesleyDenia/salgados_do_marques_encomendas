"use client";

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function OrderSearch({
  value,
  onChange,
  onClear,
  loading,
}: Readonly<{
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  loading?: boolean;
}>) {
  return (
    <div className="space-y-2">
      <label
        htmlFor="orders-search"
        className="text-sm font-medium text-foreground"
      >
        Pesquisar encomenda existente
      </label>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="orders-search"
            type="search"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Pesquisar por nº da encomenda, cliente ou contacto"
            className="pl-9"
            aria-describedby="orders-search-help"
          />
        </div>
        {value.trim() ? (
          <Button type="button" variant="outline" onClick={onClear}>
            <X className="size-4" />
            Limpar
          </Button>
        ) : null}
      </div>
      <p id="orders-search-help" className="text-xs leading-5 text-muted-foreground">
        {loading
          ? "A procurar encomendas no backend..."
          : "Use critérios operacionais relevantes para localizar rapidamente a encomenda certa."}
      </p>
    </div>
  );
}
