import {
  phasesControllerCreatePhase,
  phasesControllerUpdatePhase,
  type ApiErrorResponseDto,
  type CreatePhaseRequestDto,
  type PhaseResponseDto,
  type UpdatePhaseRequestDto,
} from "@/generated/api";
import { getApiBaseUrl } from "@/lib/api-config";

type PhaseMutationFailure = {
  readonly message: string;
  readonly ok: false;
  readonly sessionExpired?: true;
};
type PhaseMutationSuccess = { readonly ok: true; readonly phase: PhaseResponseDto };

export type CreatePhaseResult = PhaseMutationSuccess | PhaseMutationFailure;

export type UpdatePhaseResult = PhaseMutationSuccess | PhaseMutationFailure;

interface PhaseErrorMessages {
  readonly defaultMessage: string;
  readonly forbiddenMessage: string;
}

const createPhaseErrorMessages: PhaseErrorMessages = {
  defaultMessage: "La création de la phase a échoué.",
  forbiddenMessage: "Vous n'avez pas le rôle requis pour créer une phase.",
};

const updatePhaseErrorMessages: PhaseErrorMessages = {
  defaultMessage: "La modification de la phase a échoué.",
  forbiddenMessage: "Vous n'avez pas le rôle requis pour modifier une phase.",
};

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
    return buildPhaseErrorResult(
      response.error,
      response.response?.status,
      createPhaseErrorMessages,
    );
  }

  return { ok: true, phase: response.data };
}

export async function updatePhase(
  accessToken: string,
  siteId: string,
  phaseId: string,
  request: UpdatePhaseRequestDto,
): Promise<UpdatePhaseResult> {
  const response = await phasesControllerUpdatePhase({
    auth: accessToken,
    baseUrl: getApiBaseUrl(),
    body: request,
    path: { phaseId, siteId },
  });

  if (response.error) {
    return buildPhaseErrorResult(
      response.error,
      response.response?.status,
      updatePhaseErrorMessages,
    );
  }

  return { ok: true, phase: response.data };
}

function buildPhaseErrorResult(
  error: ApiErrorResponseDto,
  statusCode: number | undefined,
  messages: PhaseErrorMessages,
): PhaseMutationFailure {
  if (statusCode === 401) {
    return {
      message: "Votre session a expiré. Connectez-vous à nouveau.",
      ok: false,
      sessionExpired: true,
    };
  }

  if (statusCode === 403) {
    return {
      message: messages.forbiddenMessage,
      ok: false,
    };
  }

  if (statusCode === 404) {
    return { message: "Le chantier ou la phase est introuvable.", ok: false };
  }

  if (statusCode === undefined) {
    return { message: "Impossible de joindre l'API SmartSite.", ok: false };
  }

  const apiMessage = error.message.join(" ").trim();

  return {
    message: apiMessage.length > 0 ? apiMessage : messages.defaultMessage,
    ok: false,
  };
}
