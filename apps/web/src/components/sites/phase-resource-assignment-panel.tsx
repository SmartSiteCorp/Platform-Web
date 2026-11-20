"use client";

import { Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { PhaseResponseDto } from "@/generated/api";

import {
  AssignedWorkersList,
  ResourceLoadError,
  ResourceLoadingState,
  WorkerSelectionForm,
} from "./phase-resource-assignment-panel-content";
import {
  usePhaseResourceAssignmentPanel,
  type AssignableWorkersLoader,
  type AssignPhaseWorkersSubmitter,
  type PhaseWorkerAssignmentsLoader,
} from "./phase-resource-assignment-state";

export type {
  AssignableWorkersLoader,
  AssignPhaseWorkersSubmitter,
  PhaseWorkerAssignmentsLoader,
} from "./phase-resource-assignment-state";

interface PhaseResourceAssignmentPanelProps {
  readonly loadAssignableWorkers: AssignableWorkersLoader;
  readonly loadPhaseWorkerAssignments: PhaseWorkerAssignmentsLoader;
  readonly phase: PhaseResponseDto;
  readonly submitAssignWorkers: AssignPhaseWorkersSubmitter;
}

export function PhaseResourceAssignmentPanel({
  loadAssignableWorkers,
  loadPhaseWorkerAssignments,
  phase,
  submitAssignWorkers,
}: PhaseResourceAssignmentPanelProps) {
  const panel = usePhaseResourceAssignmentPanel({
    loadAssignableWorkers,
    loadPhaseWorkerAssignments,
    phase,
    submitAssignWorkers,
  });

  return (
    <section
      aria-label={`Assignation des ouvriers pour ${phase.name}`}
      className="mt-4 space-y-4 rounded-md border border-border bg-muted/20 p-4"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h5 className="flex items-center gap-2 text-sm font-semibold tracking-normal">
          <Users aria-hidden="true" className="h-4 w-4 text-primary" />
          Ressources affectées
        </h5>
        <Badge tone="muted">{formatAssignmentCount(panel.assignments.length)}</Badge>
      </div>

      {panel.isLoading ? (
        <ResourceLoadingState />
      ) : panel.loadError ? (
        <ResourceLoadError message={panel.loadError} onRetry={() => void panel.loadResources()} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <AssignedWorkersList assignments={panel.assignments} phaseName={phase.name} />
          <WorkerSelectionForm
            assignedWorkerIds={panel.assignedWorkerIds}
            isSubmitting={panel.isSubmitting}
            onSubmit={() => void panel.submitSelectedWorkers()}
            onToggleWorker={panel.toggleWorker}
            selectedWorkerIds={panel.selectedWorkerIds}
            submitError={panel.submitError}
            successMessage={panel.successMessage}
            unassignedWorkerCount={panel.unassignedWorkerCount}
            workers={panel.workers}
          />
        </div>
      )}
    </section>
  );
}

function formatAssignmentCount(count: number): string {
  return count === 1 ? "1 ouvrier assigné" : `${String(count)} ouvriers assignés`;
}
