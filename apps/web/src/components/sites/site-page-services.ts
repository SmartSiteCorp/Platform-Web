import type { RegisterResponseDto } from "@/generated/api";
import { downloadDocument, listDocuments, uploadDocument } from "@/lib/documents";
import { createPhase, updatePhase } from "@/lib/phases";
import {
  assignPhaseWorkers,
  loadAssignableWorkers,
  loadMyAssignedTasks,
  loadPhaseWorkerAssignments,
} from "@/lib/resource-assignments";

import type { CreatePhaseSubmitter } from "./create-phase-form";
import type { UpdatePhaseSubmitter } from "./edit-phase-form";
import type {
  AssignableWorkersLoader,
  AssignPhaseWorkersSubmitter,
  PhaseWorkerAssignmentsLoader,
} from "./phase-resource-assignment-panel";
import type { DocumentDownloader, ListDocumentsLoader } from "./site-documents-section";
import type { UploadDocumentSubmitter } from "./upload-document-form";
import type { WorkerAssignedTasksLoader } from "./worker-assigned-tasks-section";

export interface SitePageServiceOverrides {
  readonly downloadDocumentLoader?: DocumentDownloader;
  readonly loadAssignableWorkersLoader?: AssignableWorkersLoader;
  readonly loadPhaseWorkerAssignmentsLoader?: PhaseWorkerAssignmentsLoader;
  readonly loadWorkerAssignedTasksLoader?: WorkerAssignedTasksLoader;
  readonly listDocumentsLoader?: ListDocumentsLoader;
  readonly submitAssignWorkers?: AssignPhaseWorkersSubmitter;
  readonly submitCreatePhase?: CreatePhaseSubmitter;
  readonly submitUpdatePhase?: UpdatePhaseSubmitter;
  readonly submitUpload?: UploadDocumentSubmitter;
}

interface SitePageServiceOptions extends SitePageServiceOverrides {
  readonly session: RegisterResponseDto | null;
  readonly siteId: string;
}

export interface SitePageServices {
  readonly assignableWorkersLoader: AssignableWorkersLoader;
  readonly assignWorkersSubmitter: AssignPhaseWorkersSubmitter;
  readonly documentsLoader: ListDocumentsLoader;
  readonly downloader: DocumentDownloader;
  readonly phaseAssignmentsLoader: PhaseWorkerAssignmentsLoader;
  readonly phaseSubmitter: CreatePhaseSubmitter;
  readonly phaseUpdateSubmitter: UpdatePhaseSubmitter;
  readonly uploader: UploadDocumentSubmitter;
  readonly workerTasksLoader: WorkerAssignedTasksLoader;
}

export interface SitePagePermissions {
  readonly canManagePlanning: boolean;
  readonly canViewWorkerTasks: boolean;
}

export function resolveSitePagePermissions(
  session: RegisterResponseDto | null,
): SitePagePermissions {
  return {
    canManagePlanning: hasAnyRole(session, ["administrateur", "chef_chantier"]),
    canViewWorkerTasks: hasAnyRole(session, ["ouvrier"]),
  };
}

export function resolveSitePageServices({
  downloadDocumentLoader,
  loadAssignableWorkersLoader,
  loadPhaseWorkerAssignmentsLoader,
  loadWorkerAssignedTasksLoader,
  listDocumentsLoader,
  session,
  siteId,
  submitAssignWorkers,
  submitCreatePhase,
  submitUpdatePhase,
  submitUpload,
}: SitePageServiceOptions): SitePageServices {
  return {
    assignableWorkersLoader: loadAssignableWorkersLoader ?? createAssignableWorkersLoader(session),
    assignWorkersSubmitter: submitAssignWorkers ?? createAssignWorkersSubmitter(session),
    documentsLoader: listDocumentsLoader ?? createDocumentsLoader(session),
    downloader: downloadDocumentLoader ?? createDocumentDownloader(session, siteId),
    phaseAssignmentsLoader:
      loadPhaseWorkerAssignmentsLoader ?? createPhaseWorkerAssignmentsLoader(session),
    phaseSubmitter: submitCreatePhase ?? createPhaseSubmitter(session, siteId),
    phaseUpdateSubmitter: submitUpdatePhase ?? createPhaseUpdateSubmitter(session, siteId),
    uploader: submitUpload ?? createDocumentUploader(session, siteId),
    workerTasksLoader: loadWorkerAssignedTasksLoader ?? createWorkerAssignedTasksLoader(session),
  };
}

function createDocumentsLoader(session: RegisterResponseDto | null): ListDocumentsLoader {
  return (id) => {
    if (!session) {
      return Promise.resolve({
        message: "Votre session a expiré. Connectez-vous à nouveau.",
        ok: false as const,
        sessionExpired: true as const,
      });
    }

    return listDocuments(session.accessToken, id);
  };
}

function createPhaseSubmitter(
  session: RegisterResponseDto | null,
  siteId: string,
): CreatePhaseSubmitter {
  return (request) => {
    if (!session) {
      return Promise.resolve(createSessionExpiredResult());
    }

    return createPhase(session.accessToken, siteId, request);
  };
}

function createPhaseUpdateSubmitter(
  session: RegisterResponseDto | null,
  siteId: string,
): UpdatePhaseSubmitter {
  return (phaseId, request) => {
    if (!session) {
      return Promise.resolve(createSessionExpiredResult());
    }

    return updatePhase(session.accessToken, siteId, phaseId, request);
  };
}

function createAssignableWorkersLoader(
  session: RegisterResponseDto | null,
): AssignableWorkersLoader {
  return (id) => {
    if (!session) {
      return Promise.resolve(createSessionExpiredResult());
    }

    return loadAssignableWorkers(session.accessToken, id);
  };
}

function createPhaseWorkerAssignmentsLoader(
  session: RegisterResponseDto | null,
): PhaseWorkerAssignmentsLoader {
  return (id, phaseId) => {
    if (!session) {
      return Promise.resolve(createSessionExpiredResult());
    }

    return loadPhaseWorkerAssignments(session.accessToken, id, phaseId);
  };
}

function createAssignWorkersSubmitter(
  session: RegisterResponseDto | null,
): AssignPhaseWorkersSubmitter {
  return (id, phaseId, workerUserIds) => {
    if (!session) {
      return Promise.resolve(createSessionExpiredResult());
    }

    return assignPhaseWorkers(session.accessToken, id, phaseId, workerUserIds);
  };
}

function createWorkerAssignedTasksLoader(
  session: RegisterResponseDto | null,
): WorkerAssignedTasksLoader {
  return (id) => {
    if (!session) {
      return Promise.resolve(createSessionExpiredResult());
    }

    return loadMyAssignedTasks(session.accessToken, id);
  };
}

function createDocumentUploader(
  session: RegisterResponseDto | null,
  siteId: string,
): UploadDocumentSubmitter {
  return (title, documentType, file) => {
    if (!session) {
      return Promise.resolve(createSessionExpiredResult());
    }

    return uploadDocument(session.accessToken, siteId, title, documentType, file);
  };
}

function createDocumentDownloader(
  session: RegisterResponseDto | null,
  siteId: string,
): DocumentDownloader {
  return (documentId, originalName) => {
    if (!session) {
      return Promise.resolve({
        message: "Votre session a expiré. Connectez-vous à nouveau.",
        ok: false as const,
      });
    }

    return downloadDocument(session.accessToken, siteId, documentId, originalName);
  };
}

function hasAnyRole(
  session: RegisterResponseDto | null,
  expectedRoleCodes: readonly string[],
): boolean {
  if (!session) {
    return false;
  }

  return session.user.roles.some((roleCode) => expectedRoleCodes.includes(roleCode));
}

function createSessionExpiredResult() {
  return {
    message: "Votre session a expiré. Connectez-vous à nouveau.",
    ok: false as const,
    sessionExpired: true as const,
  };
}
