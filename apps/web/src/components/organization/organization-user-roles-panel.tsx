"use client";

import { Loader2, RefreshCw, UserCog } from "lucide-react";
import { useMemo, useState } from "react";

import { OrganizationInvitationDialog } from "@/components/organization/organization-invitation-dialog";
import { type OrganizationInvitationSubmitter } from "@/components/organization/organization-invitation-form";
import { OrganizationFormStatusMessage } from "@/components/organization/organization-form-status-message";
import { getAssignableOrganizationRoleCodes } from "@/components/organization/organization-role-options";
import { OrganizationUserRoleRow } from "@/components/organization/organization-user-role-row";
import {
  emptyUserRolesFilters,
  filterOrganizationUsers,
  OrganizationUserRolesFiltersBar,
  type UserRolesFilters,
} from "@/components/organization/organization-user-roles-filters";
import {
  useOrganizationUserRolesPanel,
  type OrganizationUserRolesLoader,
  type OrganizationUserRolesPanelProps as OrganizationUserRolesStateProps,
  type OrganizationUserRolesSubmitter,
  type UserRolesPanelViewModel,
} from "@/components/organization/organization-user-roles-panel-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OrganizationUserResponseDto } from "@/generated/api";

export type { OrganizationUserRolesLoader, OrganizationUserRolesSubmitter };

interface OrganizationUserRolesPanelProps extends OrganizationUserRolesStateProps {
  readonly submitOrganizationInvitation: OrganizationInvitationSubmitter;
}

export function OrganizationUserRolesPanel({
  loadOrganizationUsers,
  organizationId,
  submitOrganizationInvitation,
  submitOrganizationUserRoles,
}: OrganizationUserRolesPanelProps) {
  const panel = useOrganizationUserRolesPanel({
    loadOrganizationUsers,
    organizationId,
    submitOrganizationUserRoles,
  });

  return (
    <OrganizationUserRolesPanelContent
      organizationId={organizationId}
      panel={panel}
      submitOrganizationInvitation={submitOrganizationInvitation}
    />
  );
}

function OrganizationUserRolesPanelContent({
  organizationId,
  panel,
  submitOrganizationInvitation,
}: {
  readonly organizationId: string;
  readonly panel: UserRolesPanelViewModel;
  readonly submitOrganizationInvitation: OrganizationInvitationSubmitter;
}) {
  if (panel.panelState.status === "loading") {
    return <LoadingUserRolesPanel />;
  }

  if (panel.panelState.status === "error") {
    return (
      <UserRolesLoadErrorPanel
        message={panel.panelState.message}
        onRetry={() => void panel.reloadUsers()}
      />
    );
  }

  return (
    <ReadyUserRolesPanel
      organizationId={organizationId}
      panel={panel}
      submitOrganizationInvitation={submitOrganizationInvitation}
      users={panel.panelState.users}
    />
  );
}

function ReadyUserRolesPanel({
  organizationId,
  panel,
  submitOrganizationInvitation,
  users,
}: {
  readonly organizationId: string;
  readonly panel: UserRolesPanelViewModel;
  readonly submitOrganizationInvitation: OrganizationInvitationSubmitter;
  readonly users: readonly OrganizationUserResponseDto[];
}) {
  const [filters, setFilters] = useState<UserRolesFilters>(emptyUserRolesFilters);
  const filteredUsers = useMemo(() => filterOrganizationUsers(users, filters), [filters, users]);

  return (
    <Card className="border-2 border-border shadow-xl">
      <UserRolesHeader
        onReload={() => void panel.reloadUsers()}
        organizationId={organizationId}
        submitOrganizationInvitation={submitOrganizationInvitation}
      />
      <CardContent className="space-y-4">
        <OrganizationFormStatusMessage message={panel.apiError} tone="error" />
        <OrganizationFormStatusMessage message={panel.confirmationMessage} tone="success" />
        <OrganizationUserRolesFiltersBar filters={filters} onFiltersChange={setFilters} />
        <div aria-label="Liste des utilisateurs organisation" className="space-y-3">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <OrganizationUserRoleRow
                draftRoleCodes={
                  panel.drafts[user.id] ?? getAssignableOrganizationRoleCodes(user.roleCodes)
                }
                isSaving={panel.savingUserId === user.id}
                key={user.id}
                onSave={() => {
                  void panel.saveUserRoles(user);
                }}
                onToggleRole={(roleCode) => {
                  panel.toggleUserRole(user.id, roleCode);
                }}
                user={user}
              />
            ))
          ) : (
            <p
              className="rounded-md border border-border bg-background p-4 text-sm text-muted-foreground"
              role="status"
            >
              Aucun utilisateur ne correspond aux filtres.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function UserRolesHeader({
  onReload,
  organizationId,
  submitOrganizationInvitation,
}: {
  readonly onReload: () => void;
  readonly organizationId: string;
  readonly submitOrganizationInvitation: OrganizationInvitationSubmitter;
}) {
  return (
    <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <UserCog aria-hidden="true" className="h-5 w-5 text-primary" />
        <CardTitle>Gestion des rôles utilisateurs</CardTitle>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <OrganizationInvitationDialog
          organizationId={organizationId}
          submitOrganizationInvitation={submitOrganizationInvitation}
        />
        <Button aria-label="Recharger les utilisateurs" onClick={onReload} variant="secondary">
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          Recharger
        </Button>
      </div>
    </CardHeader>
  );
}

function LoadingUserRolesPanel() {
  return (
    <Card>
      <CardContent className="flex min-h-48 items-center justify-center gap-3 p-8 text-muted-foreground">
        <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
        <span>Chargement des utilisateurs...</span>
      </CardContent>
    </Card>
  );
}

function UserRolesLoadErrorPanel({
  message,
  onRetry,
}: {
  readonly message: string;
  readonly onRetry: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-4 p-6">
        <OrganizationFormStatusMessage message={message} tone="error" />
        <Button onClick={onRetry} variant="secondary">
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          Réessayer
        </Button>
      </CardContent>
    </Card>
  );
}
