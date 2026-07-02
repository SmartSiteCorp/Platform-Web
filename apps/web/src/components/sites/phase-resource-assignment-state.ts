import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  AssignableWorkerResponseDto,
  PhaseResponseDto,
  PhaseWorkerAssignmentResponseDto,
} from "@/generated/api";
import type {
  AssignPhaseWorkersResult,
  LoadAssignableWorkersResult,
  LoadPhaseWorkerAssignmentsResult,
} from "@/lib/resource-assignments";

const maxWorkerAssignmentsPerRequest = 50;

export type AssignableWorkersLoader = (siteId: string) => Promise<LoadAssignableWorkersResult>;

export type PhaseWorkerAssignmentsLoader = (
  siteId: string,
  phaseId: string,
) => Promise<LoadPhaseWorkerAssignmentsResult>;

export type AssignPhaseWorkersSubmitter = (
  siteId: string,
  phaseId: string,
  workerUserIds: readonly string[],
) => Promise<AssignPhaseWorkersResult>;

export interface PhaseResourceAssignmentStateOptions {
  readonly loadAssignableWorkers: AssignableWorkersLoader;
  readonly loadPhaseWorkerAssignments: PhaseWorkerAssignmentsLoader;
  readonly phase: PhaseResponseDto;
  readonly submitAssignWorkers: AssignPhaseWorkersSubmitter;
}

export interface PhaseResourceAssignmentPanelState {
  readonly assignments: readonly PhaseWorkerAssignmentResponseDto[];
  readonly assignedWorkerIds: ReadonlySet<string>;
  readonly isLoading: boolean;
  readonly isSubmitting: boolean;
  readonly loadError: string | null;
  readonly loadResources: () => Promise<void>;
  readonly selectedWorkerIds: readonly string[];
  readonly submitSelectedWorkers: () => Promise<void>;
  readonly submitError: string | null;
  readonly successMessage: string | null;
  readonly toggleWorker: (workerUserId: string) => void;
  readonly unassignedWorkerCount: number;
  readonly workers: readonly AssignableWorkerResponseDto[];
}

export function usePhaseResourceAssignmentPanel({
  loadAssignableWorkers,
  loadPhaseWorkerAssignments,
  phase,
  submitAssignWorkers,
}: PhaseResourceAssignmentStateOptions): PhaseResourceAssignmentPanelState {
  const [assignments, setAssignments] = useState<readonly PhaseWorkerAssignmentResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<readonly string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [workers, setWorkers] = useState<readonly AssignableWorkerResponseDto[]>([]);

  const assignedWorkerIds = useMemo(
    () => new Set(assignments.map((assignment) => assignment.workerUserId)),
    [assignments],
  );
  const unassignedWorkerCount = workers.filter(
    (worker) => !assignedWorkerIds.has(worker.workerUserId),
  ).length;

  const loadResources = usePhaseResourceLoader({
    loadAssignableWorkers,
    loadPhaseWorkerAssignments,
    phase,
    setAssignments,
    setIsLoading,
    setLoadError,
    setSelectedWorkerIds,
    setSubmitError,
    setSuccessMessage,
    setWorkers,
  });

  useEffect(() => {
    void loadResources();
  }, [loadResources]);

  const toggleWorker = (workerUserId: string): void => {
    setSubmitError(null);
    setSuccessMessage(null);
    setSelectedWorkerIds((currentWorkerIds) => toggleWorkerId(currentWorkerIds, workerUserId));
  };

  const submitSelectedWorkers = useSelectedWorkersSubmitter({
    phase,
    selectedWorkerIds,
    setAssignments,
    setIsSubmitting,
    setSelectedWorkerIds,
    setSubmitError,
    setSuccessMessage,
    submitAssignWorkers,
  });

  return {
    assignments,
    assignedWorkerIds,
    isLoading,
    isSubmitting,
    loadError,
    loadResources,
    selectedWorkerIds,
    submitError,
    submitSelectedWorkers,
    successMessage,
    toggleWorker,
    unassignedWorkerCount,
    workers,
  };
}

interface PhaseResourceLoaderOptions {
  readonly loadAssignableWorkers: AssignableWorkersLoader;
  readonly loadPhaseWorkerAssignments: PhaseWorkerAssignmentsLoader;
  readonly phase: PhaseResponseDto;
  readonly setAssignments: (assignments: readonly PhaseWorkerAssignmentResponseDto[]) => void;
  readonly setIsLoading: (isLoading: boolean) => void;
  readonly setLoadError: (message: string | null) => void;
  readonly setSelectedWorkerIds: (workerIds: readonly string[]) => void;
  readonly setSubmitError: (message: string | null) => void;
  readonly setSuccessMessage: (message: string | null) => void;
  readonly setWorkers: (workers: readonly AssignableWorkerResponseDto[]) => void;
}

function usePhaseResourceLoader({
  loadAssignableWorkers,
  loadPhaseWorkerAssignments,
  phase,
  setAssignments,
  setIsLoading,
  setLoadError,
  setSelectedWorkerIds,
  setSubmitError,
  setSuccessMessage,
  setWorkers,
}: PhaseResourceLoaderOptions): () => Promise<void> {
  return useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setLoadError(null);
    setSubmitError(null);
    setSuccessMessage(null);

    const [workersResult, assignmentsResult] = await Promise.all([
      loadAssignableWorkers(phase.siteId),
      loadPhaseWorkerAssignments(phase.siteId, phase.id),
    ]);

    if (!workersResult.ok) {
      setLoadError(workersResult.message);
      setIsLoading(false);
      return;
    }

    if (!assignmentsResult.ok) {
      setLoadError(assignmentsResult.message);
      setIsLoading(false);
      return;
    }

    setWorkers(workersResult.workers);
    setAssignments(assignmentsResult.assignments);
    setSelectedWorkerIds([]);
    setIsLoading(false);
  }, [
    loadAssignableWorkers,
    loadPhaseWorkerAssignments,
    phase.id,
    phase.siteId,
    setAssignments,
    setIsLoading,
    setLoadError,
    setSelectedWorkerIds,
    setSubmitError,
    setSuccessMessage,
    setWorkers,
  ]);
}

interface SelectedWorkersSubmitterOptions {
  readonly phase: PhaseResponseDto;
  readonly selectedWorkerIds: readonly string[];
  readonly setAssignments: (
    updater: (
      currentAssignments: readonly PhaseWorkerAssignmentResponseDto[],
    ) => readonly PhaseWorkerAssignmentResponseDto[],
  ) => void;
  readonly setIsSubmitting: (isSubmitting: boolean) => void;
  readonly setSelectedWorkerIds: (workerIds: readonly string[]) => void;
  readonly setSubmitError: (message: string | null) => void;
  readonly setSuccessMessage: (message: string | null) => void;
  readonly submitAssignWorkers: AssignPhaseWorkersSubmitter;
}

function useSelectedWorkersSubmitter({
  phase,
  selectedWorkerIds,
  setAssignments,
  setIsSubmitting,
  setSelectedWorkerIds,
  setSubmitError,
  setSuccessMessage,
  submitAssignWorkers,
}: SelectedWorkersSubmitterOptions): () => Promise<void> {
  return useCallback(async (): Promise<void> => {
    setSubmitError(null);
    setSuccessMessage(null);

    if (selectedWorkerIds.length === 0) {
      setSubmitError("Sélectionnez au moins un ouvrier.");
      return;
    }

    if (selectedWorkerIds.length > maxWorkerAssignmentsPerRequest) {
      setSubmitError("Trop d'ouvriers sont sélectionnés pour une seule assignation.");
      return;
    }

    setIsSubmitting(true);
    const result = await submitAssignWorkers(phase.siteId, phase.id, selectedWorkerIds);
    setIsSubmitting(false);

    if (!result.ok) {
      setSubmitError(result.message);
      return;
    }

    setAssignments((currentAssignments) =>
      mergeAssignments(currentAssignments, result.assignments),
    );
    setSelectedWorkerIds([]);
    setSuccessMessage("Affectations enregistrées.");
  }, [
    phase.id,
    phase.siteId,
    selectedWorkerIds,
    setAssignments,
    setIsSubmitting,
    setSelectedWorkerIds,
    setSubmitError,
    setSuccessMessage,
    submitAssignWorkers,
  ]);
}

function toggleWorkerId(workerUserIds: readonly string[], workerUserId: string): readonly string[] {
  if (workerUserIds.includes(workerUserId)) {
    return workerUserIds.filter((selectedWorkerId) => selectedWorkerId !== workerUserId);
  }

  return [...workerUserIds, workerUserId];
}

function mergeAssignments(
  currentAssignments: readonly PhaseWorkerAssignmentResponseDto[],
  nextAssignments: readonly PhaseWorkerAssignmentResponseDto[],
): readonly PhaseWorkerAssignmentResponseDto[] {
  const assignmentsByWorkerId = new Map<string, PhaseWorkerAssignmentResponseDto>();

  for (const assignment of currentAssignments) {
    assignmentsByWorkerId.set(assignment.workerUserId, assignment);
  }

  for (const assignment of nextAssignments) {
    assignmentsByWorkerId.set(assignment.workerUserId, assignment);
  }

  return [...assignmentsByWorkerId.values()].sort(compareAssignmentNames);
}

function compareAssignmentNames(
  firstAssignment: PhaseWorkerAssignmentResponseDto,
  secondAssignment: PhaseWorkerAssignmentResponseDto,
): number {
  const lastNameComparison = firstAssignment.workerLastName.localeCompare(
    secondAssignment.workerLastName,
    "fr",
  );

  if (lastNameComparison !== 0) {
    return lastNameComparison;
  }

  return firstAssignment.workerFirstName.localeCompare(secondAssignment.workerFirstName, "fr");
}
