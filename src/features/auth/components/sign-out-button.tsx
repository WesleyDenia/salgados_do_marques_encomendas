"use client";

import { useRouter } from "next/navigation";

import { logoutFromPanelSession } from "@/features/auth/api";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    try {
      await logoutFromPanelSession();
    } finally {
      router.replace("/signin");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      Sair
    </button>
  );
}
