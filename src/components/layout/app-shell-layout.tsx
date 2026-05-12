import React, { type ReactNode } from "react";
import Link from "next/link";

import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { OrderComposerLauncher } from "@/features/orders/components/order-composer-launcher";
import {
  getPanelNavigationItems,
  getPanelRoleLabel,
  getPanelRoleRuntime,
} from "@/lib/auth/authorization";
import type { PanelSessionUser } from "@/lib/auth/session";

export function AppShellNavigation({
  role,
}: Readonly<{
  role: string;
}>) {
  const navigationItems = getPanelNavigationItems(role);

  return (
    <nav className="space-y-2">
      {navigationItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="block rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <span className="block font-medium text-foreground">{item.label}</span>
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
            {item.description}
          </span>
        </Link>
      ))}
    </nav>
  );
}

export function AppShellLayout({
  children,
  sessionUser,
}: Readonly<{
  children: ReactNode;
  sessionUser: PanelSessionUser;
}>) {
  const roleLabel = getPanelRoleLabel(sessionUser.role);
  const roleRuntime = getPanelRoleRuntime(sessionUser.role);

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-6 px-4 py-4 md:px-6">
        <aside className="hidden w-64 shrink-0 rounded-3xl border border-border/70 bg-card/90 p-5 md:flex md:flex-col md:gap-6">
          <div className="space-y-1">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Salgados
            </p>
            <h1 className="text-xl font-semibold tracking-tight">
              Painel operacional
            </h1>
          </div>

          <AppShellNavigation role={sessionUser.role} />
        </aside>

        <div className="flex min-h-[calc(100vh-2rem)] flex-1 flex-col rounded-3xl border border-border/70 bg-background">
          <header className="border-b border-border/70 px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Shell autenticado
                </p>
                <p className="text-lg font-semibold tracking-tight">
                  Base operacional segura
                </p>
              </div>
              <div className="flex items-center gap-4">
                <OrderComposerLauncher role={sessionUser.role} />
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    {sessionUser.name}
                  </p>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {roleLabel}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Runtime: {roleRuntime ?? "desconhecido"}
                  </p>
                </div>
                <SignOutButton />
              </div>
            </div>
          </header>

          <main className="flex-1 p-5 md:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
