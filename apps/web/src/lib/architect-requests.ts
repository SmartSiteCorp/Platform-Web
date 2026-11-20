import {
  architectRequestsControllerCreateArchitectRequest,
  type ApiErrorResponseDto,
  type ArchitectRequestResponseDto,
  type CreateArchitectRequestRequestDto,
} from "@/generated/api";
import { getApiBaseUrl } from "@/lib/api-config";

type ArchitectRequestMutationFailure = {
  readonly message: string;
  readonly ok: false;
  readonly sessionExpired?: true;
};
type ArchitectRequestMutationSuccess = {
  readonly architectRequest: ArchitectRequestResponseDto;
  readonly ok: true;
};

export type CreateArchitectRequestResult =
  | ArchitectRequestMutationSuccess
  | ArchitectRequestMutationFailure;

export async function createArchitectRequest(
  accessToken: string,
  siteId: string,
  request: CreateArchitectRequestRequestDto,
): Promise<CreateArchitectRequestResult> {
  const response = await architectRequestsControllerCreateArchitectRequest({
    auth: accessToken,
    baseUrl: getApiBaseUrl(),
    body: request,
    path: { siteId },
  });

  if (response.error) {
    return buildArchitectRequestErrorResult(response.error, response.response?.status);
  }

  return { architectRequest: response.data, ok: true };
}

function buildArchitectRequestErrorResult(
  error: ApiErrorResponseDto,
  statusCode: number | undefined,
): ArchitectRequestMutationFailure {
  if (statusCode === 401) {
    return {
      message: "Votre session a expiré. Connectez-vous à nouveau.",
      ok: false,
      sessionExpired: true,
    };
  }

  if (statusCode === 403) {
    return {
      message: "Vous n'avez pas le rôle requis pour demander un architecte partenaire.",
      ok: false,
    };
  }

  if (statusCode === 404) {
    return { message: "Le chantier est introuvable.", ok: false };
  }

  if (statusCode === undefined) {
    return { message: "Impossible de joindre l'API SmartSite.", ok: false };
  }

  const apiMessage = error.message.join(" ").trim();

  return {
    message: apiMessage.length > 0 ? apiMessage : "La demande d'architecte a échoué.",
    ok: false,
  };
}
