"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SheetContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SheetContext = React.createContext<SheetContextValue | null>(null);

type SheetProps = {
  children: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function Sheet({ children, open, defaultOpen = false, onOpenChange }: SheetProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = open !== undefined;
  const currentOpen = isControlled ? open : uncontrolledOpen;

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }

      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  return (
    <SheetContext.Provider value={{ open: currentOpen, setOpen }}>
      {children}
    </SheetContext.Provider>
  );
}

function useSheetContext() {
  const context = React.useContext(SheetContext);

  if (!context) {
    throw new Error("Sheet components must be used within Sheet");
  }

  return context;
}

function SheetTrigger({
  children,
  asChild,
}: Readonly<{
  children: React.ReactElement<{ onClick?: React.MouseEventHandler }>;
  asChild?: boolean;
}>) {
  const { setOpen } = useSheetContext();

  if (asChild) {
    return React.cloneElement(children, {
      onClick: (event: React.MouseEvent) => {
        children.props.onClick?.(event);
        setOpen(true);
      },
    });
  }

  return (
    <button type="button" onClick={() => setOpen(true)}>
      {children}
    </button>
  );
}

function SheetClose({
  className,
  children,
}: Readonly<{
  className?: string;
  children?: React.ReactNode;
}>) {
  const { setOpen } = useSheetContext();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      onClick={() => setOpen(false)}
      aria-label="Fechar"
    >
      {children ?? <X className="size-4" />}
    </Button>
  );
}

function SheetContent({
  className,
  children,
}: Readonly<{
  className?: string;
  children: React.ReactNode;
}>) {
  const { open, setOpen } = useSheetContext();

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Fechar painel de encomenda"
        className="absolute inset-0 bg-black/40"
        onClick={() => setOpen(false)}
      />
      <section
        role="dialog"
        aria-modal="true"
        className={cn(
          "absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-border bg-background shadow-2xl",
          className,
        )}
      >
        {children}
      </section>
    </div>
  );
}

function SheetHeader({
  className,
  children,
}: Readonly<{
  className?: string;
  children: React.ReactNode;
}>) {
  return <div className={cn("space-y-2", className)}>{children}</div>;
}

function SheetTitle({
  className,
  children,
}: Readonly<{
  className?: string;
  children: React.ReactNode;
}>) {
  return (
    <h2 className={cn("text-xl font-semibold tracking-tight", className)}>
      {children}
    </h2>
  );
}

function SheetDescription({
  className,
  children,
}: Readonly<{
  className?: string;
  children: React.ReactNode;
}>) {
  return (
    <p className={cn("text-sm leading-6 text-muted-foreground", className)}>
      {children}
    </p>
  );
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};
