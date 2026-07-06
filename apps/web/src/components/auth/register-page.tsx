"use client";

import { ClipboardCheck, KeyRound, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

import { AuthPageShell, type AuthIntroStep } from "@/components/auth/auth-page-shell";
import { RegisterForm } from "@/components/auth/register-form";
import type { RegisterResponseDto } from "@/generated/api";
import { saveAuthSession } from "@/lib/auth-session";
import { getDashboardPathForAccount } from "@/lib/dashboard-routing";
import { registerAccount } from "@/lib/register-account";

const registerIntroSteps: readonly AuthIntroStep[] = [
  { icon: ShieldCheck, label: "Organisation" },
  { icon: KeyRound, label: "Compte admin" },
  { icon: ClipboardCheck, label: "Dashboard" },
];

export function RegisterPage() {
  const router = useRouter();

  const completeRegistration = (account: RegisterResponseDto): void => {
    saveAuthSession(account);
    router.push(getDashboardPathForAccount(account));
  };

  return (
    <AuthPageShell
      desktopDescription="Créez votre espace entreprise et centralisez vos équipes, chantiers et preuves terrain."
      formAriaLabel="Formulaire inscription"
      mobileSubtitle="Inscription organisation"
      steps={registerIntroSteps}
    >
      <RegisterForm
        onRegistrationCompleted={completeRegistration}
        submitRegistration={registerAccount}
      />
    </AuthPageShell>
  );
}
