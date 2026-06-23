import {
  organizationsControllerListOrganizationUsers,
  organizationUserRolesControllerUpdateUserRoles,
  type ApiErrorResponseDto,
  type OrganizationUserResponseDto,
  type OrganizationUserRolesResponseDto,
  type RegisterResponseDto,
  type UpdateOrganizationUserRolesRequestDto,
} from "@/generated/api";
import { getApiBaseUrl } from "@/lib/api-config";

interface OrganizationUserRolesFailureResult {
  readonly message: string;
  readonly ok: false;
  readonly sessionExpired?: true;
}

export type LoadOrganizationUsersResult =
  | {
      readonly ok: true;
      readonly users: readonly OrganizationUserResponseDto[];
    }
  | OrganizationUserRolesFailureResult;

export type UpdateOrganizationUserRolesResult =
  | {
      readonly ok: true;
      readonly userRoles: OrganizationUserRolesResponseDto;
    }
  | OrganizationUserRolesFailureResult;

export async function loadOrganizationUsers(
  session: RegisterResponseDto,
  organizationId: string,
): Promise<LoadOrganizationUsersResult> {
  const response = await organizationsControllerListOrganizationUsers({
    auth: session.accessToken,
    baseUrl: getApiBaseUrl(),
    path: { id: organizationId },
  });

  if (response.error) {
    return createOrganizationUserRolesErrorResult(
      response.error,
      response.response?.status,
      "Impossible de charger les utilisateurs de l'organisation.",
    );
  }

  return {
    ok: true,
    users: response.data.users,
  };
}

export async function updateOrganizationUserRoles(
  session: RegisterResponseDto,
  organizationId: string,
  userId: string,
  request: UpdateOrganizationUserRolesRequestDto,
): Promise<UpdateOrganizationUserRolesResult> {
  const response = await organizationUserRolesControllerUpdateUserRoles({
    auth: session.accessToken,
    baseUrl: getApiBaseUrl(),
    body: request,
    path: { organizationId, userId },
  });

  if (response.error) {
    return createOrganizationUserRolesErrorResult(
      response.error,
      response.response?.status,
      "Les rôles n'ont pas pu être sauvegardés.",
    );
  }

  return {
    ok: true,
    userRoles: response.data,
  };
}

function createOrganizationUserRolesErrorResult(
  error: ApiErrorResponseDto,
  statusCode: number | undefined,
  fallbackMessage: string,
): OrganizationUserRolesFailureResult {
  if (statusCode === 401) {
    return {
      message: "Votre session a expiré. Connectez-vous à nouveau.",
      ok: false,
      sessionExpired: true,
    };
  }

  return {
    message: getOrganizationUserRolesErrorMessage(error, statusCode, fallbackMessage),
    ok: false,
  };
}

function getOrganizationUserRolesErrorMessage(
  error: ApiErrorResponseDto,
  statusCode: number | undefined,
  fallbackMessage: string,
): string {
  if (statusCode === undefined) {
    return "Impossible de joindre l'API SmartSite.";
  }

  const apiMessage = error.message.join(" ").trim();

  return apiMessage.length > 0 ? apiMessage : fallbackMessage;
}
