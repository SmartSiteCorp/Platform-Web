"use client";

import { CheckCircle, Loader2, RefreshCcw, UserPlus } from "lucide-react";

import { OrganizationFormStatusMessage } from "@/components/organization/organization-form-status-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  AssignableWorkerResponseDto,
  PhaseWorkerAssignmentResponseDto,
} from "@/generated/api";

export function ResourceLoadingState() {
  return (
    <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
      <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
      <span>Chargement des ouvriers...</span>
    </div>
  );
}

interface ResourceLoadErrorProps {
  readonly message: string;
  readonly onRetry: () => void;
}

export function ResourceLoadError({ message, onRetry }: ResourceLoadErrorProps) {
  return (
    <div className="space-y-3">
      <OrganizationFormStatusMessage message={message} tone="error" />
      <Button className="w-full sm:w-auto" type="button" variant="secondary" onClick={onRetry}>
        <RefreshCcw aria-hidden="true" className="h-4 w-4" />
        Réessayer
      </Button>
    </div>
  );
}

interface AssignedWorkersListProps {
  readonly assignments: readonly PhaseWorkerAssignmentResponseDto[];
  readonly phaseName: string;
}

export function AssignedWorkersList({ assignments, phaseName }: AssignedWorkersListProps) {
  if (assignments.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
        Aucun ouvrier assigné à cette phase.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase text-muted-foreground">Déjà assignés</p>
      <ul aria-label={`Ouvriers assignés à ${phaseName}`} className="space-y-2">
        {assignments.map((assignment) => (
          <li
            className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm"
            key={assignment.workerUserId}
          >
            <span className="min-w-0 break-words">{formatAssignmentName(assignment)}</span>
            <CheckCircle aria-hidden="true" className="h-4 w-4 shrink-0 text-success" />
          </li>
        ))}
      </ul>
    </div>
  );
}

interface WorkerSelectionFormProps {
  readonly assignedWorkerIds: ReadonlySet<string>;
  readonly isSubmitting: boolean;
  readonly onSubmit: () => void;
  readonly onToggleWorker: (workerUserId: string) => void;
  readonly selectedWorkerIds: readonly string[];
  readonly submitError: string | null;
  readonly successMessage: string | null;
  readonly unassignedWorkerCount: number;
  readonly workers: readonly AssignableWorkerResponseDto[];
}

export function WorkerSelectionForm({
  assignedWorkerIds,
  isSubmitting,
  onSubmit,
  onToggleWorker,
  selectedWorkerIds,
  submitError,
  successMessage,
  unassignedWorkerCount,
  workers,
}: WorkerSelectionFormProps) {
  if (workers.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
        Aucun ouvrier disponible pour ce chantier.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">Ajouter des ouvriers</p>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {workers.map((worker) => (
          <WorkerCheckbox
            isAssigned={assignedWorkerIds.has(worker.workerUserId)}
            isSubmitting={isSubmitting}
            isSelected={selectedWorkerIds.includes(worker.workerUserId)}
            key={worker.workerUserId}
            onToggleWorker={onToggleWorker}
            worker={worker}
          />
        ))}
      </div>
      {unassignedWorkerCount === 0 ? (
        <p className="text-sm text-muted-foreground">
          Tous les ouvriers disponibles sont déjà assignés.
        </p>
      ) : null}
      <OrganizationFormStatusMessage message={successMessage} tone="success" />
      <OrganizationFormStatusMessage message={submitError} tone="error" />
      <Button
        className="w-full sm:w-auto"
        disabled={isSubmitting || unassignedWorkerCount === 0}
        type="button"
        onClick={onSubmit}
      >
        {isSubmitting ? (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <UserPlus aria-hidden="true" className="h-4 w-4" />
        )}
        Enregistrer les affectations
      </Button>
    </div>
  );
}

interface WorkerCheckboxProps {
  readonly isAssigned: boolean;
  readonly isSelected: boolean;
  readonly isSubmitting: boolean;
  readonly onToggleWorker: (workerUserId: string) => void;
  readonly worker: AssignableWorkerResponseDto;
}

function WorkerCheckbox({
  isAssigned,
  isSelected,
  isSubmitting,
  onToggleWorker,
  worker,
}: WorkerCheckboxProps) {
  const workerName = formatWorkerName(worker);

  return (
    <label className="flex min-h-12 items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/10">
      <input
        aria-label={isAssigned ? `${workerName} déjà assigné` : `Sélectionner ${workerName}`}
        checked={isAssigned || isSelected}
        className="h-4 w-4 shrink-0 accent-primary"
        disabled={isAssigned || isSubmitting}
        type="checkbox"
        onChange={() => {
          onToggleWorker(worker.workerUserId);
        }}
      />
      <span className="min-w-0 flex-1 break-words">{workerName}</span>
      {isAssigned ? <Badge tone="success">Assigné</Badge> : null}
    </label>
  );
}

function formatAssignmentName(assignment: PhaseWorkerAssignmentResponseDto): string {
  return `${assignment.workerFirstName} ${assignment.workerLastName}`;
}

function formatWorkerName(worker: AssignableWorkerResponseDto): string {
  return `${worker.firstName} ${worker.lastName}`;
}
