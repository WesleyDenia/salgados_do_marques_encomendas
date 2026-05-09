import type { ReactNode } from "react";

export function AuthLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-6 py-10">
      {children}
    </main>
  );
}
