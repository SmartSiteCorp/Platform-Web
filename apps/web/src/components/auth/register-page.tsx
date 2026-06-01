"use client";

import { ClipboardCheck, KeyRound, Plane, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { RegisterForm } from "@/components/auth/register-form";
import { Badge } from "@/components/ui/badge";
import type { RegisterResponseDto } from "@/generated/api";
import { saveAuthSession } from "@/lib/auth-session";
import { registerAccount } from "@/lib/register-account";

export function RegisterPage() {
  const router = useRouter();

  const completeRegistration = (account: RegisterResponseDto): void => {
    saveAuthSession(account);
    router.push("/");
  };

  return (
    <main className="relative flex min-h-screen overflow-hidden">
      <RegisterBrandPanel />
      <section
        className="relative flex w-full items-center justify-center bg-background px-6 py-8 lg:w-1/2"
        aria-label="Formulaire inscription"
      >
        <SubtleGrid />
        <div className="relative z-10 w-full max-w-md">
          <MobileBrand />
          <RegisterForm
            onRegistrationCompleted={completeRegistration}
            submitRegistration={registerAccount}
          />
          <AccentBars />
        </div>
      </section>
    </main>
  );
}

function RegisterBrandPanel() {
  return (
    <section className="relative hidden w-1/2 items-center justify-center bg-accent lg:flex">
      <LargeGrid />
      <div className="relative z-10 px-12 text-center">
        <div className="relative mb-8 inline-block rounded-2xl bg-white/15 p-6 backdrop-blur-sm">
          <Plane aria-hidden="true" className="h-16 w-16 text-white" />
          <div className="absolute -right-2 -top-2 h-4 w-4 animate-pulse rounded-full bg-success" />
        </div>
        <h1 className="text-4xl font-bold tracking-normal text-white">
          Smart<span className="text-primary">Site</span>
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-lg leading-7 text-white/80">
          Créez votre espace entreprise et centralisez vos équipes, chantiers et preuves terrain.
        </p>
        <RegisterIntroSteps />
        <AccentBars className="mt-12" />
      </div>
    </section>
  );
}

function RegisterIntroSteps() {
  return (
    <div className="mt-10 grid gap-3">
      <IntroStep icon={ShieldCheck} label="Organisation" />
      <IntroStep icon={KeyRound} label="Compte admin" />
      <IntroStep icon={ClipboardCheck} label="Dashboard" />
    </div>
  );
}

interface IntroStepProps {
  readonly icon: LucideIcon;
  readonly label: string;
}

function IntroStep({ icon: Icon, label }: IntroStepProps) {
  return (
    <div className="flex min-h-14 items-center gap-3 rounded-md border border-white/20 bg-white/10 p-4 text-white backdrop-blur-sm">
      <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-success" />
      <span className="text-sm font-semibold">{label}</span>
    </div>
  );
}

function MobileBrand() {
  return (
    <div className="mb-8 lg:hidden">
      <div className="mb-6 flex justify-center">
        <div className="relative rounded-xl bg-accent p-4">
          <Plane aria-hidden="true" className="h-8 w-8 text-white" />
          <div className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-success" />
        </div>
      </div>
      <div className="text-center">
        <Badge tone="success">Plateforme Web</Badge>
        <h1 className="mt-4 text-3xl font-bold tracking-normal">
          Smart<span className="text-primary">Site</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Inscription organisation</p>
      </div>
    </div>
  );
}

function LargeGrid() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-10"
      style={{
        backgroundImage:
          "linear-gradient(90deg, white 1px, transparent 1px), linear-gradient(white 1px, transparent 1px)",
        backgroundSize: "50px 50px",
      }}
    />
  );
}

function SubtleGrid() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.04]"
      style={{
        backgroundImage:
          "linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px), linear-gradient(hsl(var(--primary)) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }}
    />
  );
}

function AccentBars({ className = "" }: { readonly className?: string }) {
  return (
    <div className={`flex justify-center gap-2 ${className}`}>
      <div className="h-1 w-12 rounded-full bg-primary" />
      <div className="h-1 w-6 rounded-full bg-success" />
      <div className="h-1 w-3 rounded-full bg-accent" />
    </div>
  );
}
