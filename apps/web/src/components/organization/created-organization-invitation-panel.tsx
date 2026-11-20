import { Clipboard, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import type { OrganizationInvitationResponseDto } from "@/generated/api";
import { getInviteableRoleLabel } from "./organization-invitation-form.schema";

export interface CreatedOrganizationInvitationView {
  readonly email: string;
  readonly expiresAt: string;
  readonly invitationUrl: string;
  readonly roleLabels: readonly string[];
}

interface CreatedOrganizationInvitationPanelProps {
  readonly copyMessage: string | null;
  readonly createdInvitation: CreatedOrganizationInvitationView | null;
  readonly onCopyInvitationLink: () => void;
}

export function CreatedOrganizationInvitationPanel({
  copyMessage,
  createdInvitation,
  onCopyInvitationLink,
}: CreatedOrganizationInvitationPanelProps) {
  if (!createdInvitation) {
    return null;
  }

  return (
    <div className="mt-6 rounded-md border border-success/40 bg-success/10 p-4">
      <div className="flex items-start gap-3">
        <Send aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        <div className="min-w-0 flex-1 space-y-3">
          <CreatedInvitationSummary createdInvitation={createdInvitation} />
          <CreatedInvitationCopyField
            invitationUrl={createdInvitation.invitationUrl}
            onCopyInvitationLink={onCopyInvitationLink}
          />
          {copyMessage ? <p className="text-sm text-success-foreground">{copyMessage}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function buildCreatedOrganizationInvitationView(
  invitation: OrganizationInvitationResponseDto,
): CreatedOrganizationInvitationView {
  return {
    email: invitation.email,
    expiresAt: invitation.expiresAt,
    invitationUrl: buildInvitationAcceptanceUrl(invitation.token),
    roleLabels: invitation.roleCodes.map(getInviteableRoleLabel),
  };
}

function CreatedInvitationSummary({
  createdInvitation,
}: {
  readonly createdInvitation: CreatedOrganizationInvitationView;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">Lien d'invitation généré</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {createdInvitation.email} recevra les rôles {createdInvitation.roleLabels.join(", ")}.
        Expiration le {formatInvitationExpiration(createdInvitation.expiresAt)}.
      </p>
    </div>
  );
}

function CreatedInvitationCopyField({
  invitationUrl,
  onCopyInvitationLink,
}: {
  readonly invitationUrl: string;
  readonly onCopyInvitationLink: () => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
      <TextField
        error={undefined}
        icon={Clipboard}
        id="createdInvitationUrl"
        label="Lien d'invitation"
        readOnly
        type="text"
        value={invitationUrl}
      />
      <Button className="self-end" onClick={onCopyInvitationLink} type="button" variant="secondary">
        <Clipboard aria-hidden="true" className="h-4 w-4" />
        Copier
      </Button>
    </div>
  );
}

function buildInvitationAcceptanceUrl(token: string): string {
  if (typeof window === "undefined") {
    return "";
  }

  const invitationUrl = new URL("/invitations/accept", window.location.origin);
  invitationUrl.searchParams.set("token", token);

  return invitationUrl.toString();
}

function formatInvitationExpiration(expiresAt: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(expiresAt));
}
