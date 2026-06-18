"use client";

import * as React from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ClipboardList,
  LayoutDashboard,
  Menu,
  PackagePlus,
  ScanSearch,
  Settings2,
  ShieldCheck,
  CalendarClock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { OrderComposerLauncher } from "@/features/orders/components/order-composer-launcher";
import {
  getPanelNavigationItems,
  getPanelRoleLabel,
  getPanelRouteDefinition,
} from "@/lib/auth/authorization";
import type { PanelSessionUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

const navigationIcons = {
  "/dashboard": LayoutDashboard,
  "/orders": ClipboardList,
  "/planning": CalendarClock,
  "/settings/operational": Settings2,
  "/settings/access": ShieldCheck,
  "/audit/investigation": ScanSearch,
} as const;

const APP_SHELL_SIDEBAR_COLLAPSED_STORAGE_KEY = "app-shell-sidebar-collapsed";

function getNavigationIcon(href: string) {
  return (
    navigationIcons[href as keyof typeof navigationIcons] ?? LayoutDashboard
  );
}

function buildUserInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function SidebarBrand({ collapsed }: Readonly<{ collapsed: boolean }>) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3",
        collapsed && "justify-center px-2",
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-slate-950">
        <PackagePlus className="size-5" />
      </div>

      {!collapsed ? (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            Salgados do Marquês
          </p>
          <p className="truncate text-xs text-slate-300">
            Painel operacional
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function AppShellNavigation({
  role,
  collapsed = false,
  onNavigate,
}: Readonly<{
  role: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}>) {
  const pathname = usePathname() ?? "";
  const navigationItems = getPanelNavigationItems(role);

  return (
    <nav className="space-y-1.5">
      {navigationItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = getNavigationIcon(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors",
              collapsed && "justify-center px-2",
              isActive
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-200 hover:bg-white/8 hover:text-white",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {!collapsed ? (
              <div className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {item.label}
                </span>
                <span
                  className={cn(
                    "mt-0.5 block truncate text-xs",
                    isActive ? "text-slate-600" : "text-slate-400",
                  )}
                >
                  {item.description}
                </span>
              </div>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({
  sessionUser,
  collapsed,
  onNavigate,
}: Readonly<{
  sessionUser: PanelSessionUser;
  collapsed: boolean;
  onNavigate?: () => void;
}>) {
  return (
    <div
      className={cn(
        "flex h-full flex-col bg-slate-950 text-slate-100",
        collapsed ? "w-24" : "w-80",
      )}
    >
      <div className="border-b border-white/10 p-4">
        <SidebarBrand collapsed={collapsed} />
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        <div className="space-y-2">
          {!collapsed ? (
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Navegação
            </p>
          ) : null}
          <AppShellNavigation
            role={sessionUser.role}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        </div>
      </div>

      <div className="border-t border-white/10 p-4">
        <div
          className={cn(
            "rounded-2xl border border-white/10 bg-white/5 p-3",
            collapsed && "px-2 py-3",
          )}
        >
          <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
              {buildUserInitials(sessionUser.name)}
            </div>
            {!collapsed ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {sessionUser.name}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {getPanelRoleLabel(sessionUser.role)}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function AppShellHeader({
  sessionUser,
  onOpenMobile,
  onToggleDesktop,
}: Readonly<{
  sessionUser: PanelSessionUser;
  onOpenMobile: () => void;
  onToggleDesktop: () => void;
}>) {
  const pathname = usePathname() ?? "";
  const currentRoute = getPanelRouteDefinition(pathname);
  const pageLabel = currentRoute?.label ?? "Painel operacional";
  const pageDescription =
    currentRoute?.description ??
    "Acompanhe encomendas, criação e planeamento num único fluxo operacional.";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex min-h-18 items-center justify-between gap-4 px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="md:hidden"
            onClick={onOpenMobile}
          >
            <Menu className="size-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="hidden md:inline-flex"
            onClick={onToggleDesktop}
          >
            <ChevronLeft className="size-4" />
          </Button>

          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              {pageLabel}
            </p>
            <h1 className="truncate text-lg font-semibold tracking-tight text-slate-950">
              {pageDescription}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <OrderComposerLauncher role={sessionUser.role} />

          <div className="hidden text-right md:block">
            <p className="text-sm font-medium text-slate-950">{sessionUser.name}</p>
            <p className="text-xs text-slate-500">
              {getPanelRoleLabel(sessionUser.role)}
            </p>
          </div>

          <div>
            <SignOutButton />
          </div>
        </div>
      </div>
    </header>
  );
}

export function AppShellLayout({
  children,
  sessionUser,
}: Readonly<{
  children: ReactNode;
  sessionUser: PanelSessionUser;
}>) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(
      APP_SHELL_SIDEBAR_COLLAPSED_STORAGE_KEY,
    );

    if (stored === "true") {
      setCollapsed(true);
    }
  }, []);

  const handleToggleDesktop = React.useCallback(() => {
    setCollapsed((current) => {
      const nextValue = !current;

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          APP_SHELL_SIDEBAR_COLLAPSED_STORAGE_KEY,
          String(nextValue),
        );
      }

      return nextValue;
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden border-r border-white/10 bg-slate-950 md:block">
          <SidebarContent
            sessionUser={sessionUser}
            collapsed={collapsed}
          />
        </aside>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent className="left-0 right-auto max-w-80 border-l-0 border-r border-white/10 bg-slate-950 p-0">
            <SidebarContent
              sessionUser={sessionUser}
              collapsed={false}
              onNavigate={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <AppShellHeader
            sessionUser={sessionUser}
            onOpenMobile={() => setMobileOpen(true)}
            onToggleDesktop={handleToggleDesktop}
          />

          <main className="flex-1 p-4 md:p-6">
            <div className="mx-auto w-full max-w-[1600px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
