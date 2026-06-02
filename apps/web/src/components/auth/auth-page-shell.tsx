"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { SmartSiteLogo } from "@/components/brand/smartsite-logo";
import { Badge } from "@/components/ui/badge";

export interface AuthIntroStep {
  readonly icon: LucideIcon;
  readonly label: string;
}

interface AuthPageShellProps {
  readonly children: ReactNode;
  readonly desktopDescription: string;
  readonly formAriaLabel: string;
  readonly mobileSubtitle: string;
  readonly steps: readonly AuthIntroStep[];
}

export function AuthPageShell({
  children,
  desktopDescription,
  formAriaLabel,
  mobileSubtitle,
  steps,
}: AuthPageShellProps) {
  return (
    <main className="relative flex min-h-screen overflow-hidden">
      <AuthBrandPanel desktopDescription={desktopDescription} steps={steps} />
      <section
        aria-label={formAriaLabel}
        className="relative flex w-full items-center justify-center bg-background px-6 py-8 lg:w-1/2"
      >
        <SubtleGrid />
        <div className="relative z-10 w-full max-w-md">
          <MobileBrand subtitle={mobileSubtitle} />
          {children}
        </div>
      </section>
    </main>
  );
}

function AuthBrandPanel({
  desktopDescription,
  steps,
}: {
  readonly desktopDescription: string;
  readonly steps: readonly AuthIntroStep[];
}) {
  return (
    <section className="relative hidden w-1/2 items-center justify-center bg-accent lg:flex">
      <LargeGrid />
      <div className="relative z-10 px-12 text-center">
        <div className="mb-8 inline-flex items-center justify-center rounded-2xl bg-white/20 p-4 backdrop-blur-sm">
          <SmartSiteLogo className="h-24 w-24" priority />
        </div>
        <h1 className="text-4xl font-bold tracking-normal text-white">
          Smart<span className="text-primary">Site</span>
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-lg leading-7 text-white/80">
          {desktopDescription}
        </p>
        <AuthIntroSteps steps={steps} />
      </div>
    </section>
  );
}

function AuthIntroSteps({ steps }: { readonly steps: readonly AuthIntroStep[] }) {
  return (
    <div className="mt-10 grid gap-3">
      {steps.map((step) => (
        <IntroStep icon={step.icon} key={step.label} label={step.label} />
      ))}
    </div>
  );
}

function IntroStep({
  icon: Icon,
  label,
}: {
  readonly icon: LucideIcon;
  readonly label: string;
}) {
  return (
    <div className="flex min-h-14 items-center gap-3 rounded-md border border-white/20 bg-white/10 p-4 text-white backdrop-blur-sm">
      <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-success" />
      <span className="text-sm font-semibold">{label}</span>
    </div>
  );
}

function MobileBrand({ subtitle }: { readonly subtitle: string }) {
  return (
    <div className="mb-8 lg:hidden">
      <div className="mb-6 flex justify-center">
        <div className="inline-flex items-center justify-center rounded-xl bg-accent/10 p-2">
          <SmartSiteLogo className="h-16 w-16" priority />
        </div>
      </div>
      <div className="text-center">
        <Badge tone="success">Plateforme Web</Badge>
        <h1 className="mt-4 text-3xl font-bold tracking-normal">
          Smart<span className="text-primary">Site</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
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
