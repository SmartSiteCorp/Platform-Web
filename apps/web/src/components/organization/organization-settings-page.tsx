"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

import { AppHeader } from "@/components/layout/app-header";
import {
  OrganizationInvitationForm,
  type OrganizationInvitationSubmitter,
} from "@/components/organization/organization-invitation-form";
import {
  OrganizationSettingsForm,
  type OrganizationUpdateSubmitter,
} from "@/components/organization/organization-settings-form";
import {
  LoadErrorPanel,
  LoadingOrganizationPanel,
  MissingSessionPanel,
  OrganizationSettingsIntro,
  OrganizationSummaryPanel,
} from "@/components/organization/organization-settings-panels";
import type { OrganizationResponseDto, RegisterResponseDto } from "@/generated/api";
import {
  clearAuthSession,
  readAuthSession,
  saveOrganizationInAuthSession,
} from "@/lib/auth-session";
import {
  loadOrganizationSettings,
  updateOrganizationSettings,
  type OrganizationSettingsResult,
} from "@/lib/organization-settings";
import { createOrganizationInvitation } from "@/lib/organization-invitations";
import { useAuthSessionExpiration } from "@/lib/use-auth-session";

export type OrganizationSettingsLoader = (
  session: RegisterResponseDto,
) => Promise<OrganizationSettingsResult>;

export type OrganizationSettingsSubmitter = typeof updateOrganizationSettings;
export type OrganizationInvitationCreator = typeof createOrganizationInvitation;

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
  readonly submitOrganizationInvitation?: OrganizationInvitationCreator;
  readonly submitOrganizationSettings?: OrganizationSettingsSubmitter;
}

type OrganizationSettingsStateSetter = Dispatch<SetStateAction<OrganizationSettingsPageState>>;

interface InitialOrganizationStateOptions {
  readonly loadOrganizationDetails: OrganizationSettingsLoader;
  readonly redirectToLogin: () => void;
  readonly setPageState: OrganizationSettingsStateSetter;
}

export function OrganizationSettingsPage({
  loadOrganizationDetails = loadOrganizationSettings,
  submitOrganizationInvitation = createOrganizationInvitation,
  submitOrganizationSettings = updateOrganizationSettings,
}: OrganizationSettingsPageProps) {
  const {
    pageState,
    saveOrganizationState,
    submitCurrentOrganizationInvitation,
    submitCurrentOrganizationUpdate,
  } = useOrganizationSettingsState({
    loadOrganizationDetails,
    submitOrganizationInvitation,
    submitOrganizationSettings,
  });

  return (
    <main className="min-h-screen bg-background">
      <AppHeader activeItem="organization-settings" />
      <section className="container py-8">
        <OrganizationSettingsIntro />
        <OrganizationSettingsContent
          onOrganizationSaved={saveOrganizationState}
          pageState={pageState}
          submitOrganizationInvitation={submitCurrentOrganizationInvitation}
          submitOrganizationUpdate={submitCurrentOrganizationUpdate}
        />
      </section>
    </main>
  );
}

function useOrganizationSettingsState({
  loadOrganizationDetails,
  submitOrganizationInvitation,
  submitOrganizationSettings,
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

  const submitCurrentOrganizationUpdate: OrganizationUpdateSubmitter = (
    organizationId,
    request,
  ) => {
    const currentSession = getSessionFromState(pageState);

    if (!currentSession) {
      return Promise.resolve({ message: "Session utilisateur introuvable.", ok: false });
    }

    return submitOrganizationSettings(currentSession, organizationId, request).then((result) => {
      if (!result.ok && result.sessionExpired) {
        clearAuthSession();
        setPageState({ status: "missing-session" });
        redirectToLogin();
      }

      return result;
    });
  };

  const submitCurrentOrganizationInvitation: OrganizationInvitationSubmitter = (
    organizationId,
    request,
  ) => {
    const currentSession = getSessionFromState(pageState);

    if (!currentSession) {
      return Promise.resolve({ message: "Session utilisateur introuvable.", ok: false });
    }

    return submitOrganizationInvitation(currentSession, organizationId, request).then((result) => {
      if (!result.ok && result.sessionExpired) {
        clearAuthSession();
        setPageState({ status: "missing-session" });
        redirectToLogin();
      }

      return result;
    });
  };

  const saveOrganizationState = (organization: OrganizationResponseDto): void => {
    const currentSession = getSessionFromState(pageState);

    if (!currentSession) {
      return;
    }

    const updatedSession = saveOrganizationInAuthSession(currentSession, organization);

    setPageState({ organization, session: updatedSession, status: "ready" });
  };

  return {
    pageState,
    saveOrganizationState,
    submitCurrentOrganizationInvitation,
    submitCurrentOrganizationUpdate,
  };
}

function OrganizationSettingsContent({
  onOrganizationSaved,
  pageState,
  submitOrganizationInvitation,
  submitOrganizationUpdate,
}: {
  readonly onOrganizationSaved: (organization: OrganizationResponseDto) => void;
  readonly pageState: OrganizationSettingsPageState;
  readonly submitOrganizationInvitation: OrganizationInvitationSubmitter;
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
      <div className="grid gap-6">
        <OrganizationSettingsForm
          onOrganizationSaved={onOrganizationSaved}
          organization={pageState.organization}
          submitOrganizationUpdate={submitOrganizationUpdate}
        />
        <OrganizationInvitationForm
          organizationId={pageState.organization.id}
          submitOrganizationInvitation={submitOrganizationInvitation}
        />
      </div>
      <OrganizationSummaryPanel organization={pageState.organization} />
    </div>
  );
}

function loadInitialOrganizationState({
  loadOrganizationDetails,
  redirectToLogin,
  setPageState,
}: InitialOrganizationStateOptions): (() => void) | undefined {
  let canApplyResult = true;
  const storedSession = readAuthSession();

  if (!storedSession) {
    setPageState({ status: "missing-session" });
    redirectToLogin();
    return undefined;
  }

  // La session donne l'organisation courante, puis l'API recharge la donnée fiable.
  setPageState({ session: storedSession, status: "loading-organization" });

  void loadOrganizationDetails(storedSession)
    .then((result) => {
      if (!canApplyResult) {
        return;
      }

      if (!result.ok && result.sessionExpired) {
        clearAuthSession();
        setPageState({ status: "missing-session" });
        redirectToLogin();
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
