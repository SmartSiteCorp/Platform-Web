import {
  organizationsControllerListOrganizationUsers,
  projectUsersControllerAdd,
  projectUsersControllerList,
  type ApiErrorResponseDto,
  type OrganizationUserResponseDto,
  type ProjectUserResponseDto,
} from "@/generated/api";
import { getApiBaseUrl } from "@/lib/api-config";

export type ProjectUsersResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly message: string };

export async function listProjectUsers(
  accessToken: string,
  projectId: string,
): Promise<ProjectUsersResult<ProjectUserResponseDto[]>> {
  try {
    const response = await projectUsersControllerList({
      auth: accessToken,
      baseUrl: getApiBaseUrl(),
      path: { id: projectId },
    });
    if (response.error) return apiFailure(response.error, response.response?.status);
    return { ok: true, data: response.data };
  } catch {
    return networkFailure();
  }
}

export async function listAvailableProjectUsers(
  accessToken: string,
  organizationId: string,
): Promise<ProjectUsersResult<OrganizationUserResponseDto[]>> {
  try {
    const response = await organizationsControllerListOrganizationUsers({
      auth: accessToken,
      baseUrl: getApiBaseUrl(),
      path: { id: organizationId },
    });
    if (response.error) return apiFailure(response.error, response.response?.status);
    return {
      ok: true,
      data: response.data.users.filter(
        (user) =>
          user.organizationId === organizationId &&
          user.status === "active" &&
          user.roleCodes.length > 0,
      ),
    };
  } catch {
    return networkFailure();
  }
}

export async function addProjectUser(
  accessToken: string,
  projectId: string,
  userId: string,
): Promise<ProjectUsersResult<ProjectUserResponseDto>> {
  try {
    const response = await projectUsersControllerAdd({
      auth: accessToken,
      baseUrl: getApiBaseUrl(),
      path: { id: projectId },
      body: { userId },
    });
    if (response.error) return apiFailure(response.error, response.response?.status);
    return { ok: true, data: response.data };
  } catch {
    return networkFailure();
  }
}

function apiFailure(
  error: ApiErrorResponseDto,
  status: number | undefined,
): ProjectUsersResult<never> {
  if (status === undefined) return networkFailure();
  return {
    ok: false,
    message:
      status === 401
        ? "Votre session a expiré. Connectez-vous à nouveau."
        : error.message.join(" ").trim() || "Impossible de gérer les intervenants du chantier.",
  };
}

function networkFailure(): ProjectUsersResult<never> {
  return { ok: false, message: "Impossible de joindre l'API SmartSite." };
}
