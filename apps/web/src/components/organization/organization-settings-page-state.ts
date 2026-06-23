import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type {
  OrganizationUserRolesLoader,
  OrganizationUserRolesSubmitter,
} from "@/components/organization/organization-user-roles-panel-state";
import type { OrganizationInvitationSubmitter } from "@/components/organization/organization-invitation-form";
import type { OrganizationUpdateSubmitter } from "@/components/organization/organization-settings-form";
import {
  getSessionFromState,
  loadInitialOrganizationState,
  type OrganizationSettingsLoader,
  type OrganizationSettingsPageState,
  type OrganizationSettingsStateSetter,
} from "@/components/organization/organization-settings-page-state-helpers";
import type { OrganizationResponseDto } from "@/generated/api";
import { clearAuthSession, saveOrganizationInAuthSession } from "@/lib/auth-session";
import { createOrganizationInvitation } from "@/lib/organization-invitations";
import { updateOrganizationSettings } from "@/lib/organization-settings";
import { loadOrganizationUsers, updateOrganizationUserRoles } from "@/lib/organization-user-roles";
import { useAuthSessionExpiration } from "@/lib/use-auth-session";

export type { OrganizationSettingsLoader, OrganizationSettingsPageState };

export type OrganizationSettingsSubmitter = typeof updateOrganizationSettings;
export type OrganizationInvitationCreator = typeof createOrganizationInvitation;
export type OrganizationUsersFetcher = typeof loadOrganizationUsers;
export type OrganizationUserRolesUpdater = typeof updateOrganizationUserRoles;

export interface OrganizationSettingsPageProps {
  readonly loadOrganizationUsersList?: OrganizationUsersFetcher;
  readonly loadOrganizationDetails?: OrganizationSettingsLoader;
  readonly submitOrganizationInvitation?: OrganizationInvitationCreator;
  readonly submitOrganizationSettings?: OrganizationSettingsSubmitter;
  readonly submitOrganizationUserRoles?: OrganizationUserRolesUpdater;
}

export function useOrganizationSettingsState({
  loadOrganizationUsersList,
  loadOrganizationDetails,
  submitOrganizationInvitation,
  submitOrganizationSettings,
  submitOrganizationUserRoles,
}: Required<OrganizationSettingsPageProps>) {
  const router = useRouter();
  const [pageState, setPageState] = useState<OrganizationSettingsPageState>({
    status: "loading-session",
  });
  const activeSession = getSessionFromState(pageState);
  const redirectToLogin = (): void => {
    router.replace("/login");
  };

  useAuthSessionExpiration(activeSession);

  useEffect(
    () =>
      loadInitialOrganizationState({
        loadOrganizationDetails,
        redirectToLogin,
        setPageState,
      }),
    [loadOrganizationDetails, router],
  );

  const loadCurrentOrganizationUsers = useLoadCurrentOrganizationUsers({
    loadOrganizationUsersList,
    pageState,
    redirectToLogin,
    setPageState,
  });
  const submitCurrentOrganizationUpdate = useSubmitCurrentOrganizationUpdate({
    pageState,
    redirectToLogin,
    setPageState,
    submitOrganizationSettings,
  });
  const submitCurrentOrganizationInvitation = useSubmitCurrentOrganizationInvitation({
    pageState,
    redirectToLogin,
    setPageState,
    submitOrganizationInvitation,
  });
  const submitCurrentOrganizationUserRoles = useSubmitCurrentOrganizationUserRoles({
    pageState,
    redirectToLogin,
    setPageState,
    submitOrganizationUserRoles,
  });
  const saveOrganizationState = (organization: OrganizationResponseDto): void => {
    const currentSession = getSessionFromState(pageState);

    if (!currentSession) {
      return;
    }

    const updatedSession = saveOrganizationInAuthSession(currentSession, organization);

    setPageState({ organization, session: updatedSession, status: "ready" });
  };

  return {
    loadCurrentOrganizationUsers,
    pageState,
    saveOrganizationState,
    submitCurrentOrganizationInvitation,
    submitCurrentOrganizationUpdate,
    submitCurrentOrganizationUserRoles,
  };
}

function useLoadCurrentOrganizationUsers({
  loadOrganizationUsersList,
  pageState,
  redirectToLogin,
  setPageState,
}: {
  readonly loadOrganizationUsersList: OrganizationUsersFetcher;
  readonly pageState: OrganizationSettingsPageState;
  readonly redirectToLogin: () => void;
  readonly setPageState: OrganizationSettingsStateSetter;
}): OrganizationUserRolesLoader {
  return useCallback(
    (organizationId) => {
      const currentSession = getSessionFromState(pageState);

      if (!currentSession) {
        return Promise.resolve({ message: "Session utilisateur introuvable.", ok: false });
      }

      return loadOrganizationUsersList(currentSession, organizationId).then((result) => {
        expireSessionIfNeeded(result, setPageState, redirectToLogin);

        return result;
      });
    },
    [loadOrganizationUsersList, pageState],
  );
}

function useSubmitCurrentOrganizationUpdate({
  pageState,
  redirectToLogin,
  setPageState,
  submitOrganizationSettings,
}: {
  readonly pageState: OrganizationSettingsPageState;
  readonly redirectToLogin: () => void;
  readonly setPageState: OrganizationSettingsStateSetter;
  readonly submitOrganizationSettings: OrganizationSettingsSubmitter;
}): OrganizationUpdateSubmitter {
  return useCallback(
    (organizationId, request) => {
      const currentSession = getSessionFromState(pageState);

      if (!currentSession) {
        return Promise.resolve({ message: "Session utilisateur introuvable.", ok: false });
      }

      return submitOrganizationSettings(currentSession, organizationId, request).then((result) => {
        expireSessionIfNeeded(result, setPageState, redirectToLogin);

        return result;
      });
    },
    [pageState, submitOrganizationSettings],
  );
}

function useSubmitCurrentOrganizationInvitation({
  pageState,
  redirectToLogin,
  setPageState,
  submitOrganizationInvitation,
}: {
  readonly pageState: OrganizationSettingsPageState;
  readonly redirectToLogin: () => void;
  readonly setPageState: OrganizationSettingsStateSetter;
  readonly submitOrganizationInvitation: OrganizationInvitationCreator;
}): OrganizationInvitationSubmitter {
  return useCallback(
    (organizationId, request) => {
      const currentSession = getSessionFromState(pageState);

      if (!currentSession) {
        return Promise.resolve({ message: "Session utilisateur introuvable.", ok: false });
      }

      return submitOrganizationInvitation(currentSession, organizationId, request).then(
        (result) => {
          expireSessionIfNeeded(result, setPageState, redirectToLogin);

          return result;
        },
      );
    },
    [pageState, submitOrganizationInvitation],
  );
}

function useSubmitCurrentOrganizationUserRoles({
  pageState,
  redirectToLogin,
  setPageState,
  submitOrganizationUserRoles,
}: {
  readonly pageState: OrganizationSettingsPageState;
  readonly redirectToLogin: () => void;
  readonly setPageState: OrganizationSettingsStateSetter;
  readonly submitOrganizationUserRoles: OrganizationUserRolesUpdater;
}): OrganizationUserRolesSubmitter {
  return useCallback(
    (organizationId, userId, request) => {
      const currentSession = getSessionFromState(pageState);

      if (!currentSession) {
        return Promise.resolve({ message: "Session utilisateur introuvable.", ok: false });
      }

      return submitOrganizationUserRoles(currentSession, organizationId, userId, request).then(
        (result) => {
          expireSessionIfNeeded(result, setPageState, redirectToLogin);

          return result;
        },
      );
    },
    [pageState, submitOrganizationUserRoles],
  );
}

function expireSessionIfNeeded(
  result: { readonly ok: boolean; readonly sessionExpired?: true },
  setPageState: OrganizationSettingsStateSetter,
  redirectToLogin: () => void,
): void {
  if (result.ok || !result.sessionExpired) {
    return;
  }

  clearAuthSession();
  setPageState({ status: "missing-session" });
  redirectToLogin();
}
