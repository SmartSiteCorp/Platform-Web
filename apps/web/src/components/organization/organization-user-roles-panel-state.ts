import { type AssignableOrganizationRoleCode } from "@smartsite/shared";
import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";

import {
  createUserRoleDrafts,
  getRoleSelectionError,
  getUserDisplayName,
  toggleRoleCode,
  type UserRoleDrafts,
} from "@/components/organization/organization-user-role-row";
import { getAssignableOrganizationRoleCodes } from "@/components/organization/organization-role-options";
import type {
  OrganizationUserResponseDto,
  UpdateOrganizationUserRolesRequestDto,
} from "@/generated/api";
import type {
  LoadOrganizationUsersResult,
  UpdateOrganizationUserRolesResult,
} from "@/lib/organization-user-roles";

export type OrganizationUserRolesLoader = (
  organizationId: string,
) => Promise<LoadOrganizationUsersResult>;

export type OrganizationUserRolesSubmitter = (
  organizationId: string,
  userId: string,
  request: UpdateOrganizationUserRolesRequestDto,
) => Promise<UpdateOrganizationUserRolesResult>;

export interface OrganizationUserRolesPanelProps {
  readonly loadOrganizationUsers: OrganizationUserRolesLoader;
  readonly organizationId: string;
  readonly submitOrganizationUserRoles: OrganizationUserRolesSubmitter;
}

export type OrganizationUsersPanelState =
  | { readonly status: "loading" }
  | { readonly message: string; readonly status: "error" }
  | {
      readonly status: "ready";
      readonly users: readonly OrganizationUserResponseDto[];
    };

export interface UserRolesPanelViewModel {
  readonly apiError: string | null;
  readonly confirmationMessage: string | null;
  readonly drafts: UserRoleDrafts;
  readonly panelState: OrganizationUsersPanelState;
  readonly reloadUsers: () => Promise<void>;
  readonly saveUserRoles: (user: OrganizationUserResponseDto) => Promise<void>;
  readonly savingUserId: string | null;
  readonly toggleUserRole: (userId: string, roleCode: AssignableOrganizationRoleCode) => void;
}

type OrganizationUsersPanelStateSetter = Dispatch<SetStateAction<OrganizationUsersPanelState>>;
type UserRoleDraftsSetter = Dispatch<SetStateAction<UserRoleDrafts>>;

interface SaveUserRolesOptions {
  readonly drafts: UserRoleDrafts;
  readonly organizationId: string;
  readonly panelState: OrganizationUsersPanelState;
  readonly setApiError: Dispatch<SetStateAction<string | null>>;
  readonly setConfirmationMessage: Dispatch<SetStateAction<string | null>>;
  readonly setDrafts: UserRoleDraftsSetter;
  readonly setPanelState: OrganizationUsersPanelStateSetter;
  readonly setSavingUserId: Dispatch<SetStateAction<string | null>>;
  readonly submitOrganizationUserRoles: OrganizationUserRolesSubmitter;
  readonly user: OrganizationUserResponseDto;
}

export function useOrganizationUserRolesPanel({
  loadOrganizationUsers,
  organizationId,
  submitOrganizationUserRoles,
}: OrganizationUserRolesPanelProps): UserRolesPanelViewModel {
  const [panelState, setPanelState] = useState<OrganizationUsersPanelState>({ status: "loading" });
  const [drafts, setDrafts] = useState<UserRoleDrafts>({});
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);
  const reloadUsers = useReloadOrganizationUsers({
    loadOrganizationUsers,
    organizationId,
    setApiError,
    setConfirmationMessage,
    setDrafts,
    setPanelState,
  });

  useEffect(() => {
    void reloadUsers();
  }, [reloadUsers]);

  const toggleUserRole = useToggleUserRole(setApiError, setConfirmationMessage, setDrafts);
  const saveUserRoles = useSaveUserRoles({
    drafts,
    organizationId,
    panelState,
    setApiError,
    setConfirmationMessage,
    setDrafts,
    setPanelState,
    setSavingUserId,
    submitOrganizationUserRoles,
  });

  return {
    apiError,
    confirmationMessage,
    drafts,
    panelState,
    reloadUsers,
    saveUserRoles,
    savingUserId,
    toggleUserRole,
  };
}

function useReloadOrganizationUsers({
  loadOrganizationUsers,
  organizationId,
  setApiError,
  setConfirmationMessage,
  setDrafts,
  setPanelState,
}: {
  readonly loadOrganizationUsers: OrganizationUserRolesLoader;
  readonly organizationId: string;
  readonly setApiError: Dispatch<SetStateAction<string | null>>;
  readonly setConfirmationMessage: Dispatch<SetStateAction<string | null>>;
  readonly setDrafts: UserRoleDraftsSetter;
  readonly setPanelState: OrganizationUsersPanelStateSetter;
}) {
  return useCallback(async (): Promise<void> => {
    setApiError(null);
    setConfirmationMessage(null);
    setPanelState({ status: "loading" });

    const result = await loadOrganizationUsers(organizationId);

    if (!result.ok) {
      setPanelState({ message: result.message, status: "error" });
      return;
    }

    setDrafts(createUserRoleDrafts(result.users));
    setPanelState({ status: "ready", users: result.users });
  }, [
    loadOrganizationUsers,
    organizationId,
    setApiError,
    setConfirmationMessage,
    setDrafts,
    setPanelState,
  ]);
}

function useToggleUserRole(
  setApiError: Dispatch<SetStateAction<string | null>>,
  setConfirmationMessage: Dispatch<SetStateAction<string | null>>,
  setDrafts: UserRoleDraftsSetter,
) {
  return useCallback(
    (userId: string, roleCode: AssignableOrganizationRoleCode): void => {
      setApiError(null);
      setConfirmationMessage(null);
      setDrafts((currentDrafts) => ({
        ...currentDrafts,
        [userId]: toggleRoleCode(currentDrafts[userId] ?? [], roleCode),
      }));
    },
    [setApiError, setConfirmationMessage, setDrafts],
  );
}

function useSaveUserRoles({
  drafts,
  organizationId,
  panelState,
  setApiError,
  setConfirmationMessage,
  setDrafts,
  setPanelState,
  setSavingUserId,
  submitOrganizationUserRoles,
}: Omit<SaveUserRolesOptions, "user">) {
  return useCallback(
    (user: OrganizationUserResponseDto) =>
      saveOrganizationUserRoles({
        drafts,
        organizationId,
        panelState,
        setApiError,
        setConfirmationMessage,
        setDrafts,
        setPanelState,
        setSavingUserId,
        submitOrganizationUserRoles,
        user,
      }),
    [drafts, organizationId, panelState, submitOrganizationUserRoles],
  );
}

async function saveOrganizationUserRoles(options: SaveUserRolesOptions): Promise<void> {
  if (options.panelState.status !== "ready") {
    return;
  }

  const selectedRoleCodes =
    options.drafts[options.user.id] ?? getAssignableOrganizationRoleCodes(options.user.roleCodes);
  const validationMessage = getRoleSelectionError(options.user.roleCodes, selectedRoleCodes);

  if (validationMessage) {
    options.setApiError(validationMessage);
    return;
  }

  options.setSavingUserId(options.user.id);
  options.setApiError(null);
  options.setConfirmationMessage(null);

  const result = await options.submitOrganizationUserRoles(
    options.organizationId,
    options.user.id,
    {
      roleCodes: [...selectedRoleCodes],
    },
  );

  applyUserRolesResult({ ...options, result, selectedRoleCodes });
}

function applyUserRolesResult({
  result,
  selectedRoleCodes,
  setApiError,
  setConfirmationMessage,
  setDrafts,
  setPanelState,
  setSavingUserId,
  user,
}: SaveUserRolesOptions & {
  readonly result: UpdateOrganizationUserRolesResult;
  readonly selectedRoleCodes: readonly AssignableOrganizationRoleCode[];
}): void {
  setSavingUserId(null);

  if (!result.ok) {
    setApiError(result.message);
    return;
  }

  const nextSelectedRoleCodes = getAssignableOrganizationRoleCodes(result.userRoles.roleCodes);

  setPanelState((currentState) => updateUserRolesInPanelState(currentState, user, result));
  setDrafts((currentDrafts) => ({
    ...currentDrafts,
    [user.id]: nextSelectedRoleCodes.length > 0 ? nextSelectedRoleCodes : selectedRoleCodes,
  }));
  setConfirmationMessage(`Rôles mis à jour pour ${getUserDisplayName(user)}.`);
}

function updateUserRolesInPanelState(
  currentState: OrganizationUsersPanelState,
  user: OrganizationUserResponseDto,
  result: Extract<UpdateOrganizationUserRolesResult, { readonly ok: true }>,
): OrganizationUsersPanelState {
  if (currentState.status !== "ready") {
    return currentState;
  }

  return {
    status: "ready",
    users: currentState.users.map((currentUser) =>
      currentUser.id === user.id
        ? { ...currentUser, roleCodes: result.userRoles.roleCodes }
        : currentUser,
    ),
  };
}
