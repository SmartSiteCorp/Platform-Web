import {
  organizationsControllerGetOrganization,
  organizationsControllerUpdateOrganization,
  type ApiErrorResponseDto,
  type OrganizationResponseDto,
  type RegisterResponseDto,
  type UpdateOrganizationRequestDto,
} from "@/generated/api";
import { getApiBaseUrl } from "@/lib/api-config";

export type OrganizationSettingsResult =
  | {
      readonly ok: true;
      readonly organization: OrganizationResponseDto;
    }
  | {
      readonly message: string;
      readonly ok: false;
      readonly sessionExpired?: true;
    };

export async function loadOrganizationSettings(
  session: RegisterResponseDto,
): Promise<OrganizationSettingsResult> {
  const response = await organizationsControllerGetOrganization({
    auth: session.accessToken,
    baseUrl: getApiBaseUrl(),
    path: { id: session.organization.id },
  });

  if (response.error) {
    return createOrganizationErrorResult(
      response.error,
      response.response?.status,
      "Impossible de charger les informations de l'entreprise.",
    );
  }

  return { ok: true, organization: response.data };
}

export async function updateOrganizationSettings(
  session: RegisterResponseDto,
  organizationId: string,
  request: UpdateOrganizationRequestDto,
): Promise<OrganizationSettingsResult> {
  const response = await organizationsControllerUpdateOrganization({
    auth: session.accessToken,
    baseUrl: getApiBaseUrl(),
    body: request,
    path: { id: organizationId },
  });

  if (response.error) {
    return createOrganizationErrorResult(
      response.error,
      response.response?.status,
      "Les informations de l'entreprise n'ont pas pu être sauvegardées.",
    );
  }

  return { ok: true, organization: response.data };
}

function createOrganizationErrorResult(
  error: ApiErrorResponseDto,
  statusCode: number | undefined,
  fallbackMessage: string,
): OrganizationSettingsResult {
  if (statusCode === 401) {
    return {
      message: "Votre session a expiré. Connectez-vous à nouveau.",
      ok: false,
      sessionExpired: true,
    };
  }

  return {
    message: getOrganizationErrorMessage(error, statusCode, fallbackMessage),
    ok: false,
  };
}

function getOrganizationErrorMessage(
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
