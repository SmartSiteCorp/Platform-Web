import {
  phasesControllerCreatePhase,
  type ApiErrorResponseDto,
  type CreatePhaseRequestDto,
  type PhaseResponseDto,
} from "@/generated/api";
import { getApiBaseUrl } from "@/lib/api-config";

export type CreatePhaseResult =
  | { readonly ok: true; readonly phase: PhaseResponseDto }
  | { readonly message: string; readonly ok: false; readonly sessionExpired?: true };

export async function createPhase(
  accessToken: string,
  siteId: string,
  request: CreatePhaseRequestDto,
): Promise<CreatePhaseResult> {
  const response = await phasesControllerCreatePhase({
    auth: accessToken,
    baseUrl: getApiBaseUrl(),
    body: request,
    path: { siteId },
  });

  if (response.error) {
    return buildPhaseErrorResult(response.error, response.response?.status);
  }

  return { ok: true, phase: response.data };
}

function buildPhaseErrorResult(
  error: ApiErrorResponseDto,
  statusCode: number | undefined,
): CreatePhaseResult {
  if (statusCode === 401) {
    return {
      message: "Votre session a expiré. Connectez-vous à nouveau.",
      ok: false,
      sessionExpired: true,
    };
  }

  if (statusCode === 403) {
    return {
      message: "Vous n'avez pas le rôle requis pour créer une phase.",
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
    message: apiMessage.length > 0 ? apiMessage : "La création de la phase a échoué.",
    ok: false,
  };
}
