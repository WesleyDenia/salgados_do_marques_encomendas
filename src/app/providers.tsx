"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/api/query-client";
import { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
}
