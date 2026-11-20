import {
  droneRequestsControllerCreateDroneRequest,
  type ApiErrorResponseDto,
  type CreateDroneRequestRequestDto,
  type DroneRequestResponseDto,
} from "@/generated/api";
import { getApiBaseUrl } from "@/lib/api-config";

type DroneRequestMutationFailure = {
  readonly message: string;
  readonly ok: false;
  readonly sessionExpired?: true;
};
type DroneRequestMutationSuccess = {
  readonly droneRequest: DroneRequestResponseDto;
  readonly ok: true;
};

export type CreateDroneRequestResult = DroneRequestMutationSuccess | DroneRequestMutationFailure;

export async function createDroneRequest(
  accessToken: string,
  siteId: string,
  request: CreateDroneRequestRequestDto,
): Promise<CreateDroneRequestResult> {
  const response = await droneRequestsControllerCreateDroneRequest({
    auth: accessToken,
    baseUrl: getApiBaseUrl(),
    body: request,
    path: { siteId },
  });

  if (response.error) {
    return buildDroneRequestErrorResult(response.error, response.response?.status);
  }

  return { droneRequest: response.data, ok: true };
}

function buildDroneRequestErrorResult(
  error: ApiErrorResponseDto,
  statusCode: number | undefined,
): DroneRequestMutationFailure {
  if (statusCode === 401) {
    return {
      message: "Votre session a expiré. Connectez-vous à nouveau.",
      ok: false,
      sessionExpired: true,
    };
  }

  if (statusCode === 403) {
    return {
      message: "Vous n'avez pas le rôle requis pour demander un droniste partenaire.",
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
    message: apiMessage.length > 0 ? apiMessage : "La demande de droniste a échoué.",
    ok: false,
  };
}
