"use client";

import { AppHeader } from "@/components/layout/app-header";
import { type OrganizationInvitationSubmitter } from "@/components/organization/organization-invitation-form";
import {
  OrganizationSettingsForm,
  type OrganizationUpdateSubmitter,
} from "@/components/organization/organization-settings-form";
import {
  OrganizationUserRolesPanel,
  type OrganizationUserRolesLoader,
  type OrganizationUserRolesSubmitter,
} from "@/components/organization/organization-user-roles-panel";
import {
  LoadErrorPanel,
  LoadingOrganizationPanel,
  MissingSessionPanel,
  OrganizationSettingsIntro,
  OrganizationSummaryPanel,
} from "@/components/organization/organization-settings-panels";
import {
  useOrganizationSettingsState,
  type OrganizationSettingsPageProps,
  type OrganizationSettingsPageState,
} from "@/components/organization/organization-settings-page-state";
import type { OrganizationResponseDto } from "@/generated/api";
import { createOrganizationInvitation } from "@/lib/organization-invitations";
import { loadOrganizationSettings, updateOrganizationSettings } from "@/lib/organization-settings";
import { loadOrganizationUsers, updateOrganizationUserRoles } from "@/lib/organization-user-roles";

export type {
  OrganizationInvitationCreator,
  OrganizationSettingsLoader,
  OrganizationSettingsSubmitter,
  OrganizationUserRolesUpdater,
  OrganizationUsersFetcher,
} from "@/components/organization/organization-settings-page-state";

export function OrganizationSettingsPage({
  loadOrganizationUsersList = loadOrganizationUsers,
  loadOrganizationDetails = loadOrganizationSettings,
  submitOrganizationInvitation = createOrganizationInvitation,
  submitOrganizationSettings = updateOrganizationSettings,
  submitOrganizationUserRoles = updateOrganizationUserRoles,
}: OrganizationSettingsPageProps) {
  const {
    loadCurrentOrganizationUsers,
    pageState,
    saveOrganizationState,
    submitCurrentOrganizationInvitation,
    submitCurrentOrganizationUpdate,
    submitCurrentOrganizationUserRoles,
  } = useOrganizationSettingsState({
    loadOrganizationUsersList,
    loadOrganizationDetails,
    submitOrganizationInvitation,
    submitOrganizationSettings,
    submitOrganizationUserRoles,
  });

  return (
    <main className="min-h-screen bg-background">
      <AppHeader activeItem="organization-settings" />
      <section className="container py-8">
        <OrganizationSettingsIntro />
        <OrganizationSettingsContent
          loadOrganizationUsers={loadCurrentOrganizationUsers}
          onOrganizationSaved={saveOrganizationState}
          pageState={pageState}
          submitOrganizationInvitation={submitCurrentOrganizationInvitation}
          submitOrganizationUpdate={submitCurrentOrganizationUpdate}
          submitOrganizationUserRoles={submitCurrentOrganizationUserRoles}
        />
      </section>
    </main>
  );
}

function OrganizationSettingsContent({
  loadOrganizationUsers,
  onOrganizationSaved,
  pageState,
  submitOrganizationInvitation,
  submitOrganizationUpdate,
  submitOrganizationUserRoles,
}: {
  readonly loadOrganizationUsers: OrganizationUserRolesLoader;
  readonly onOrganizationSaved: (organization: OrganizationResponseDto) => void;
  readonly pageState: OrganizationSettingsPageState;
  readonly submitOrganizationInvitation: OrganizationInvitationSubmitter;
  readonly submitOrganizationUpdate: OrganizationUpdateSubmitter;
  readonly submitOrganizationUserRoles: OrganizationUserRolesSubmitter;
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
    <div aria-label="Espace responsive paramètres" className="grid gap-6">
      <OrganizationSummaryPanel organization={pageState.organization} />
      <OrganizationSettingsForm
        onOrganizationSaved={onOrganizationSaved}
        organization={pageState.organization}
        submitOrganizationUpdate={submitOrganizationUpdate}
      />
      <OrganizationUserRolesPanel
        loadOrganizationUsers={loadOrganizationUsers}
        organizationId={pageState.organization.id}
        submitOrganizationInvitation={submitOrganizationInvitation}
        submitOrganizationUserRoles={submitOrganizationUserRoles}
      />
    </div>
  );
}
