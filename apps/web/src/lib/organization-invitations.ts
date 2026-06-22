import {
  organizationInvitationsControllerAcceptInvitation,
  organizationInvitationsControllerCreateInvitation,
  type AcceptOrganizationInvitationRequestDto,
  type AcceptOrganizationInvitationResponseDto,
  type CreateOrganizationInvitationRequestDto,
  type OrganizationInvitationResponseDto,
  type OrganizationInvitationsControllerCreateInvitationError,
  type RegisterResponseDto,
} from "@/generated/api";
import { getApiBaseUrl } from "@/lib/api-config";

type OrganizationInvitationApiError = OrganizationInvitationsControllerCreateInvitationError;

export type CreateOrganizationInvitationResult =
  | {
      readonly invitation: OrganizationInvitationResponseDto;
      readonly ok: true;
    }
  | {
      readonly message: string;
      readonly ok: false;
      readonly sessionExpired?: true;
    };

export type AcceptOrganizationInvitationResult =
  | {
      readonly account: AcceptOrganizationInvitationResponseDto;
      readonly ok: true;
    }
  | {
      readonly message: string;
      readonly ok: false;
    };

export async function createOrganizationInvitation(
  session: RegisterResponseDto,
  organizationId: string,
  request: CreateOrganizationInvitationRequestDto,
): Promise<CreateOrganizationInvitationResult> {
  const response = await organizationInvitationsControllerCreateInvitation({
    auth: session.accessToken,
    baseUrl: getApiBaseUrl(),
    body: request,
    path: { id: organizationId },
  });

  if (response.error) {
    return createInvitationErrorResult(response.error, response.response?.status);
  }

  return {
    invitation: response.data,
    ok: true,
  };
}

export async function acceptOrganizationInvitation(
  request: AcceptOrganizationInvitationRequestDto,
): Promise<AcceptOrganizationInvitationResult> {
  const response = await organizationInvitationsControllerAcceptInvitation({
    baseUrl: getApiBaseUrl(),
    body: request,
  });

  if (response.error) {
    return {
      message: getInvitationErrorMessage(
        response.error,
        response.response?.status,
        "L'invitation n'a pas pu être acceptée.",
      ),
      ok: false,
    };
  }

  return {
    account: response.data,
    ok: true,
  };
}

function createInvitationErrorResult(
  error: OrganizationInvitationsControllerCreateInvitationError,
  statusCode: number | undefined,
): CreateOrganizationInvitationResult {
  if (statusCode === 401) {
    return {
      message: "Votre session a expiré. Connectez-vous à nouveau.",
      ok: false,
      sessionExpired: true,
    };
  }

  return {
    message: getInvitationErrorMessage(error, statusCode, "L'invitation n'a pas pu être créée."),
    ok: false,
  };
}

function getInvitationErrorMessage(
  error: OrganizationInvitationApiError,
  statusCode: number | undefined,
  fallbackMessage: string,
): string {
  if (statusCode === undefined) {
    return "Impossible de joindre l'API SmartSite.";
  }

  const apiMessage = error.message.join(" ").trim();

  return apiMessage.length > 0 ? apiMessage : fallbackMessage;
}
