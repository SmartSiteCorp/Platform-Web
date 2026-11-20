"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { clearAuthSession } from "@/lib/auth-session";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = (): void => {
    clearAuthSession();
    router.replace("/login");
  };

  return (
    <button
      aria-label="Se déconnecter"
      className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/20 px-3 text-sm font-semibold text-accent-foreground/90 transition-colors hover:bg-white/10"
      onClick={handleLogout}
      type="button"
    >
      <LogOut aria-hidden="true" className="h-4 w-4" />
      <span className="hidden sm:inline">Déconnexion</span>
    </button>
  );
}
