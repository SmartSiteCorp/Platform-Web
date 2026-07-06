"use client";

import { KeyRound, LayoutDashboard, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthPageShell, type AuthIntroStep } from "@/components/auth/auth-page-shell";
import { AuthApiError } from "@/components/auth/auth-api-error";
import { OrganizationInvitationAcceptanceForm } from "@/components/organization/organization-invitation-acceptance-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AcceptOrganizationInvitationResponseDto } from "@/generated/api";
import { saveAuthSession } from "@/lib/auth-session";
import { getDashboardPathForAccount } from "@/lib/dashboard-routing";
import { acceptOrganizationInvitation } from "@/lib/organization-invitations";

const invitationAcceptanceSteps: readonly AuthIntroStep[] = [
  { icon: MailCheck, label: "Invitation sécurisée" },
  { icon: KeyRound, label: "Compte utilisateur" },
  { icon: LayoutDashboard, label: "Accès dashboard" },
];

export function OrganizationInvitationAcceptancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitationToken = searchParams.get("token")?.trim() ?? "";

  const completeInvitationAcceptance = (account: AcceptOrganizationInvitationResponseDto): void => {
    saveAuthSession(account);
    router.push(getDashboardPathForAccount(account));
  };

  return (
    <AuthPageShell
      desktopDescription="Finalisez votre invitation et rejoignez l'organisation SmartSite qui vous attend."
      formAriaLabel="Formulaire acceptation invitation"
      mobileSubtitle="Acceptation d'invitation"
      steps={invitationAcceptanceSteps}
    >
      {invitationToken.length > 0 ? (
        <OrganizationInvitationAcceptanceForm
          onInvitationAccepted={completeInvitationAcceptance}
          submitInvitationAcceptance={acceptOrganizationInvitation}
          token={invitationToken}
        />
      ) : (
        <InvalidInvitationTokenPanel />
      )}
    </AuthPageShell>
  );
}

function InvalidInvitationTokenPanel() {
  return (
    <Card className="w-full border-2 border-border shadow-xl">
      <CardHeader>
        <Badge tone="warning">Invitation</Badge>
        <CardTitle className="text-xl">Lien d'invitation invalide</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <AuthApiError message="Le lien d'invitation ne contient pas de token valide." />
        <p className="text-sm leading-6 text-muted-foreground">
          Demandez à votre administrateur organisation de générer une nouvelle invitation.
        </p>
        <Link
          className="inline-flex h-11 w-full items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          href="/login"
        >
          Retour à la connexion
        </Link>
      </CardContent>
    </Card>
  );
}
