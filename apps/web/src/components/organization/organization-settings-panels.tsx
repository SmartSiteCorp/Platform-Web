import { AlertCircle, Building2, Loader2, Mail, MapPin, Phone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OrganizationResponseDto } from "@/generated/api";

export function OrganizationSettingsIntro() {
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

export function OrganizationSummaryPanel({
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

export function LoadingOrganizationPanel() {
  return (
    <Card>
      <CardContent className="flex min-h-48 items-center justify-center gap-3 p-8 text-muted-foreground">
        <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
        <span>Chargement des informations entreprise...</span>
      </CardContent>
    </Card>
  );
}

export function MissingSessionPanel() {
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

export function LoadErrorPanel({ message }: { readonly message: string }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-6 text-destructive">
        <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
        <p className="text-sm font-medium">{message}</p>
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
