import {
  resourceAssignmentsControllerAssignWorkersToPhase,
  resourceAssignmentsControllerListAssignableWorkers,
  resourceAssignmentsControllerListMyAssignedTasks,
  resourceAssignmentsControllerListPhaseWorkerAssignments,
  type ApiErrorResponseDto,
  type AssignableWorkerResponseDto,
  type PhaseWorkerAssignmentResponseDto,
  type WorkerAssignedTaskResponseDto,
} from "@/generated/api";
import { getApiBaseUrl } from "@/lib/api-config";

type ResourceAssignmentFailure = {
  readonly message: string;
  readonly ok: false;
  readonly sessionExpired?: true;
};

export type LoadAssignableWorkersResult =
  | {
      readonly ok: true;
      readonly siteId: string;
      readonly workers: readonly AssignableWorkerResponseDto[];
    }
  | ResourceAssignmentFailure;

export type LoadPhaseWorkerAssignmentsResult =
  | {
      readonly assignments: readonly PhaseWorkerAssignmentResponseDto[];
      readonly ok: true;
      readonly phaseId: string;
      readonly siteId: string;
    }
  | ResourceAssignmentFailure;

export type AssignPhaseWorkersResult =
  | {
      readonly assignments: readonly PhaseWorkerAssignmentResponseDto[];
      readonly ok: true;
      readonly phaseId: string;
      readonly siteId: string;
    }
  | ResourceAssignmentFailure;

export type LoadWorkerAssignedTasksResult =
  | {
      readonly ok: true;
      readonly siteId: string;
      readonly tasks: readonly WorkerAssignedTaskResponseDto[];
      readonly workerUserId: string;
    }
  | ResourceAssignmentFailure;

interface ResourceAssignmentErrorMessages {
  readonly defaultMessage: string;
  readonly forbiddenMessage: string;
  readonly notFoundMessage: string;
}

const managementErrorMessages: ResourceAssignmentErrorMessages = {
  defaultMessage: "Le chargement des ressources a échoué.",
  forbiddenMessage: "Vous n'avez pas le rôle requis pour gérer les ressources.",
  notFoundMessage: "Le chantier ou la phase est introuvable.",
};

const assignmentErrorMessages: ResourceAssignmentErrorMessages = {
  defaultMessage: "L'assignation des ouvriers a échoué.",
  forbiddenMessage: "Vous n'avez pas le rôle requis pour assigner des ouvriers.",
  notFoundMessage: "Le chantier ou la phase est introuvable.",
};

const workerTasksErrorMessages: ResourceAssignmentErrorMessages = {
  defaultMessage: "Le chargement des tâches a échoué.",
  forbiddenMessage: "Vous n'avez pas accès aux tâches de ce chantier.",
  notFoundMessage: "Le chantier est introuvable.",
};

export async function loadAssignableWorkers(
  accessToken: string,
  siteId: string,
): Promise<LoadAssignableWorkersResult> {
  const response = await resourceAssignmentsControllerListAssignableWorkers({
    auth: accessToken,
    baseUrl: getApiBaseUrl(),
    path: { siteId },
  });

  if (response.error) {
    return buildResourceAssignmentErrorResult(
      response.error,
      response.response?.status,
      managementErrorMessages,
    );
  }

  return { ok: true, siteId: response.data.siteId, workers: response.data.workers };
}

export async function loadPhaseWorkerAssignments(
  accessToken: string,
  siteId: string,
  phaseId: string,
): Promise<LoadPhaseWorkerAssignmentsResult> {
  const response = await resourceAssignmentsControllerListPhaseWorkerAssignments({
    auth: accessToken,
    baseUrl: getApiBaseUrl(),
    path: { phaseId, siteId },
  });

  if (response.error) {
    return buildResourceAssignmentErrorResult(
      response.error,
      response.response?.status,
      managementErrorMessages,
    );
  }

  return {
    assignments: response.data.assignments,
    ok: true,
    phaseId: response.data.phaseId,
    siteId: response.data.siteId,
  };
}

export async function assignPhaseWorkers(
  accessToken: string,
  siteId: string,
  phaseId: string,
  workerUserIds: readonly string[],
): Promise<AssignPhaseWorkersResult> {
  const response = await resourceAssignmentsControllerAssignWorkersToPhase({
    auth: accessToken,
    baseUrl: getApiBaseUrl(),
    body: { workerUserIds: [...workerUserIds] },
    path: { phaseId, siteId },
  });

  if (response.error) {
    return buildResourceAssignmentErrorResult(
      response.error,
      response.response?.status,
      assignmentErrorMessages,
    );
  }

  return {
    assignments: response.data.assignments,
    ok: true,
    phaseId: response.data.phaseId,
    siteId: response.data.siteId,
  };
}

export async function loadMyAssignedTasks(
  accessToken: string,
  siteId: string,
): Promise<LoadWorkerAssignedTasksResult> {
  const response = await resourceAssignmentsControllerListMyAssignedTasks({
    auth: accessToken,
    baseUrl: getApiBaseUrl(),
    path: { siteId },
  });

  if (response.error) {
    return buildResourceAssignmentErrorResult(
      response.error,
      response.response?.status,
      workerTasksErrorMessages,
    );
  }

  return {
    ok: true,
    siteId: response.data.siteId,
    tasks: response.data.tasks,
    workerUserId: response.data.workerUserId,
  };
}

function buildResourceAssignmentErrorResult(
  error: ApiErrorResponseDto,
  statusCode: number | undefined,
  messages: ResourceAssignmentErrorMessages,
): ResourceAssignmentFailure {
  if (statusCode === 401) {
    return {
      message: "Votre session a expiré. Connectez-vous à nouveau.",
      ok: false,
      sessionExpired: true,
    };
  }

  if (statusCode === 403) {
    return { message: messages.forbiddenMessage, ok: false };
  }

  if (statusCode === 404) {
    return { message: messages.notFoundMessage, ok: false };
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
