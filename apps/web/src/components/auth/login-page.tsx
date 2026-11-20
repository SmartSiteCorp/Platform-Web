"use client";

import { Building2, KeyRound, LayoutDashboard } from "lucide-react";
import { useRouter } from "next/navigation";

import { AuthPageShell, type AuthIntroStep } from "@/components/auth/auth-page-shell";
import { LoginForm } from "@/components/auth/login-form";
import type { LoginResponseDto } from "@/generated/api";
import { saveAuthSession } from "@/lib/auth-session";
import { getDashboardPathForAccount } from "@/lib/dashboard-routing";
import { loginAccount } from "@/lib/login-account";

const loginIntroSteps: readonly AuthIntroStep[] = [
  { icon: KeyRound, label: "Connexion sécurisée" },
  { icon: Building2, label: "Espace entreprise" },
  { icon: LayoutDashboard, label: "Dashboard" },
];

export function LoginPage() {
  const router = useRouter();

  const completeLogin = (account: LoginResponseDto): void => {
    saveAuthSession(account);
    router.push(getDashboardPathForAccount(account));
  };

  return (
    <AuthPageShell
      desktopDescription="Connectez-vous à votre espace entreprise et reprenez le suivi de vos chantiers."
      formAriaLabel="Formulaire connexion"
      mobileSubtitle="Connexion utilisateur"
      steps={loginIntroSteps}
    >
      <LoginForm onLoginCompleted={completeLogin} submitLogin={loginAccount} />
    </AuthPageShell>
  );
}
