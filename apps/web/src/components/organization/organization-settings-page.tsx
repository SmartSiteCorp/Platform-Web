"use client";

import { AlertCircle, Building2, Loader2, Mail, MapPin, Phone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AppHeader } from "@/components/layout/app-header";
import {
  OrganizationSettingsForm,
  type OrganizationUpdateSubmitter,
} from "@/components/organization/organization-settings-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OrganizationResponseDto, RegisterResponseDto } from "@/generated/api";
import { readAuthSession, saveOrganizationInAuthSession } from "@/lib/auth-session";
import {
  loadOrganizationSettings,
  updateOrganizationSettings,
  type OrganizationSettingsResult,
} from "@/lib/organization-settings";

export type OrganizationSettingsLoader = (
  session: RegisterResponseDto,
) => Promise<OrganizationSettingsResult>;

export type OrganizationSettingsSubmitter = typeof updateOrganizationSettings;

type OrganizationSettingsPageState =
  | { readonly status: "loading-session" }
  | { readonly status: "missing-session" }
  | { readonly session: RegisterResponseDto; readonly status: "loading-organization" }
  | {
      readonly organization: OrganizationResponseDto;
      readonly session: RegisterResponseDto;
      readonly status: "ready";
    }
  | {
      readonly message: string;
      readonly session: RegisterResponseDto;
      readonly status: "load-error";
    };

interface OrganizationSettingsPageProps {
  readonly loadOrganizationDetails?: OrganizationSettingsLoader;
  readonly submitOrganizationSettings?: OrganizationSettingsSubmitter;
}

export function OrganizationSettingsPage({
  loadOrganizationDetails = loadOrganizationSettings,
  submitOrganizationSettings = updateOrganizationSettings,
}: OrganizationSettingsPageProps) {
  const [pageState, setPageState] = useState<OrganizationSettingsPageState>({
    status: "loading-session",
  });

  useEffect(() => {
    let canApplyResult = true;
    const storedSession = readAuthSession();

    if (!storedSession) {
      setPageState({ status: "missing-session" });
      return;
    }

    // La session donne l'organisation courante, puis l'API recharge la donnée fiable.
    setPageState({ session: storedSession, status: "loading-organization" });

    void loadOrganizationDetails(storedSession)
      .then((result) => {
        if (!canApplyResult) {
          return;
        }

        setPageState(createLoadedState(storedSession, result));
      })
      .catch(() => {
        if (!canApplyResult) {
          return;
        }

        setPageState({
          message: "Impossible de charger les informations de l'entreprise.",
          session: storedSession,
          status: "load-error",
        });
      });

    return () => {
      canApplyResult = false;
    };
  }, [loadOrganizationDetails]);

  const submitCurrentOrganizationUpdate: OrganizationUpdateSubmitter = (
    organizationId,
    request,
  ) => {
    const currentSession = getSessionFromState(pageState);

    if (!currentSession) {
      return Promise.resolve({ message: "Session utilisateur introuvable.", ok: false });
    }

    return submitOrganizationSettings(currentSession, organizationId, request);
  };

  const saveOrganizationState = (organization: OrganizationResponseDto): void => {
    const currentSession = getSessionFromState(pageState);

    if (!currentSession) {
      return;
    }

    const updatedSession = saveOrganizationInAuthSession(currentSession, organization);

    setPageState({ organization, session: updatedSession, status: "ready" });
  };

  return (
    <main className="min-h-screen bg-background">
      <AppHeader activeItem="organization-settings" />
      <section className="container py-8">
        <OrganizationSettingsIntro />
        <OrganizationSettingsContent
          onOrganizationSaved={saveOrganizationState}
          pageState={pageState}
          submitOrganizationUpdate={submitCurrentOrganizationUpdate}
        />
      </section>
    </main>
  );
}

function OrganizationSettingsIntro() {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <Badge tone="success">Organisation</Badge>
        <h1 className="mt-3 text-3xl font-bold tracking-normal">Paramètres entreprise</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Gérez les coordonnées utilisées pour l'espace SmartSite de votre entreprise.
        </p>
      </div>
      <Badge tone="muted">Admin organisation</Badge>
    </div>
  );
}

function OrganizationSettingsContent({
  onOrganizationSaved,
  pageState,
  submitOrganizationUpdate,
}: {
  readonly onOrganizationSaved: (organization: OrganizationResponseDto) => void;
  readonly pageState: OrganizationSettingsPageState;
  readonly submitOrganizationUpdate: OrganizationUpdateSubmitter;
}) {
  if (pageState.status === "missing-session") {
    return <MissingSessionPanel />;
  }

  if (pageState.status === "load-error") {
    return <LoadErrorPanel message={pageState.message} />;
  }

  if (pageState.status !== "ready") {
    return <LoadingOrganizationPanel />;
  }

  return (
    <div aria-label="Espace responsive paramètres" className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <OrganizationSettingsForm
        onOrganizationSaved={onOrganizationSaved}
        organization={pageState.organization}
        submitOrganizationUpdate={submitOrganizationUpdate}
      />
      <OrganizationSummaryPanel organization={pageState.organization} />
    </div>
  );
}

function OrganizationSummaryPanel({
  organization,
}: {
  readonly organization: OrganizationResponseDto;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Aperçu organisation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SummaryLine icon={Building2} label="Entreprise" value={organization.name} />
        <SummaryLine icon={Mail} label="Email" value={organization.email ?? "Non renseigné"} />
        <SummaryLine icon={Phone} label="Téléphone" value={organization.phone ?? "Non renseigné"} />
        <SummaryLine
          icon={MapPin}
          label="Adresse"
          value={organization.address ?? "Non renseignée"}
        />
      </CardContent>
    </Card>
  );
}

function SummaryLine({
  icon: Icon,
  label,
  value,
}: {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-background p-3">
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div>
        <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function LoadingOrganizationPanel() {
  return (
    <Card>
      <CardContent className="flex min-h-48 items-center justify-center gap-3 p-8 text-muted-foreground">
        <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
        <span>Chargement des informations entreprise...</span>
      </CardContent>
    </Card>
  );
}

function MissingSessionPanel() {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-4 p-6">
        <Badge tone="warning">Session requise</Badge>
        <p className="text-sm text-muted-foreground">
          Connectez-vous à une organisation pour modifier ses paramètres.
        </p>
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          href="/login"
        >
          Se connecter
        </Link>
      </CardContent>
    </Card>
  );
}

function LoadErrorPanel({ message }: { readonly message: string }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-6 text-destructive">
        <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
        <p className="text-sm font-medium">{message}</p>
      </CardContent>
    </Card>
  );
}

function createLoadedState(
  session: RegisterResponseDto,
  result: OrganizationSettingsResult,
): OrganizationSettingsPageState {
  if (!result.ok) {
    return { message: result.message, session, status: "load-error" };
  }

  return { organization: result.organization, session, status: "ready" };
}

function getSessionFromState(state: OrganizationSettingsPageState): RegisterResponseDto | null {
  if (state.status === "loading-session" || state.status === "missing-session") {
    return null;
  }

  return state.session;
}
