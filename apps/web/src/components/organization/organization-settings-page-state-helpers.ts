import type { Dispatch, SetStateAction } from "react";

import type { OrganizationResponseDto, RegisterResponseDto } from "@/generated/api";
import { clearAuthSession, isOrganizationAdmin, readAuthSession } from "@/lib/auth-session";
import type { OrganizationSettingsResult } from "@/lib/organization-settings";

export type OrganizationSettingsLoader = (
  session: RegisterResponseDto,
) => Promise<OrganizationSettingsResult>;

export type OrganizationSettingsPageState =
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

export type OrganizationSettingsStateSetter = Dispatch<
  SetStateAction<OrganizationSettingsPageState>
>;

interface InitialOrganizationStateOptions {
  readonly loadOrganizationDetails: OrganizationSettingsLoader;
  readonly redirectToDashboard: () => void;
  readonly redirectToLogin: () => void;
  readonly setPageState: OrganizationSettingsStateSetter;
}

export function loadInitialOrganizationState({
  loadOrganizationDetails,
  redirectToDashboard,
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

  // Vérification anticipée du rôle admin avant tout appel API.
  if (!isOrganizationAdmin(storedSession)) {
    setPageState({ status: "missing-session" });
    redirectToDashboard();
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

export function getSessionFromState(
  state: OrganizationSettingsPageState,
): RegisterResponseDto | null {
  if (state.status === "loading-session" || state.status === "missing-session") {
    return null;
  }

  return state.session;
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
