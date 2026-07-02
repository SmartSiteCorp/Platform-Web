"use client";

import { CalendarDays, Clock, ListOrdered, Pencil, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { OrganizationFormStatusMessage } from "@/components/organization/organization-form-status-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PhaseResponseDto } from "@/generated/api";

import { CreatePhaseForm, type CreatePhaseSubmitter } from "./create-phase-form";
import { EditPhaseForm, type UpdatePhaseSubmitter } from "./edit-phase-form";
import {
  PhaseResourceAssignmentPanel,
  type AssignableWorkersLoader,
  type AssignPhaseWorkersSubmitter,
  type PhaseWorkerAssignmentsLoader,
} from "./phase-resource-assignment-panel";

interface SitePhasesSectionProps {
  readonly loadAssignableWorkers: AssignableWorkersLoader;
  readonly loadPhaseWorkerAssignments: PhaseWorkerAssignmentsLoader;
  readonly submitAssignWorkers: AssignPhaseWorkersSubmitter;
  readonly submitCreatePhase: CreatePhaseSubmitter;
  readonly submitUpdatePhase: UpdatePhaseSubmitter;
}

export function SitePhasesSection({
  loadAssignableWorkers,
  loadPhaseWorkerAssignments,
  submitAssignWorkers,
  submitCreatePhase,
  submitUpdatePhase,
}: SitePhasesSectionProps) {
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [phaseUpdateMessage, setPhaseUpdateMessage] = useState<string | null>(null);
  const [phases, setPhases] = useState<readonly PhaseResponseDto[]>([]);

  const handlePhaseCreated = (phase: PhaseResponseDto): void => {
    setPhaseUpdateMessage(null);
    setPhases((prev) => [...prev, phase].sort(comparePhasePosition));
  };

  const handlePhaseUpdated = (phase: PhaseResponseDto): void => {
    setPhases((prev) =>
      prev
        .map((existingPhase) => (existingPhase.id === phase.id ? phase : existingPhase))
        .sort(comparePhasePosition),
    );
    setEditingPhaseId(null);
    setPhaseUpdateMessage(`"${phase.name}" a été mise à jour avec succès.`);
  };

  const handleStartEdit = (phaseId: string): void => {
    setPhaseUpdateMessage(null);
    setEditingPhaseId(phaseId);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Badge tone="warning">Planning</Badge>
          <CardTitle className="mt-3 flex items-center gap-2">
            <ListOrdered aria-hidden="true" className="h-5 w-5 text-primary" />
            Phases chantier
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <CreatePhaseForm
          onPhaseCreated={handlePhaseCreated}
          submitCreatePhase={submitCreatePhase}
        />
        <OrganizationFormStatusMessage message={phaseUpdateMessage} tone="success" />
        <PhaseList
          editingPhaseId={editingPhaseId}
          loadAssignableWorkers={loadAssignableWorkers}
          loadPhaseWorkerAssignments={loadPhaseWorkerAssignments}
          onCancelEdit={() => {
            setEditingPhaseId(null);
          }}
          onPhaseUpdated={handlePhaseUpdated}
          onStartEdit={handleStartEdit}
          phases={phases}
          submitAssignWorkers={submitAssignWorkers}
          submitUpdatePhase={submitUpdatePhase}
        />
      </CardContent>
    </Card>
  );
}

function comparePhasePosition(first: PhaseResponseDto, second: PhaseResponseDto): number {
  return first.position - second.position;
}

interface PhaseListProps {
  readonly editingPhaseId: string | null;
  readonly loadAssignableWorkers: AssignableWorkersLoader;
  readonly loadPhaseWorkerAssignments: PhaseWorkerAssignmentsLoader;
  readonly onCancelEdit: () => void;
  readonly onPhaseUpdated: (phase: PhaseResponseDto) => void;
  readonly onStartEdit: (phaseId: string) => void;
  readonly phases: readonly PhaseResponseDto[];
  readonly submitAssignWorkers: AssignPhaseWorkersSubmitter;
  readonly submitUpdatePhase: UpdatePhaseSubmitter;
}

function PhaseList({
  editingPhaseId,
  loadAssignableWorkers,
  loadPhaseWorkerAssignments,
  onCancelEdit,
  onPhaseUpdated,
  onStartEdit,
  phases,
  submitAssignWorkers,
  submitUpdatePhase,
}: PhaseListProps) {
  if (phases.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        Aucune phase créée pour ce chantier.
      </p>
    );
  }

  return (
    <ol aria-label="Liste des phases chantier" className="space-y-3">
      {phases.map((phase) => (
        <PhaseItem
          isEditing={editingPhaseId === phase.id}
          key={phase.id}
          loadAssignableWorkers={loadAssignableWorkers}
          loadPhaseWorkerAssignments={loadPhaseWorkerAssignments}
          onCancelEdit={onCancelEdit}
          onPhaseUpdated={onPhaseUpdated}
          onStartEdit={onStartEdit}
          phase={phase}
          submitAssignWorkers={submitAssignWorkers}
          submitUpdatePhase={submitUpdatePhase}
        />
      ))}
    </ol>
  );
}

interface PhaseItemProps {
  readonly isEditing: boolean;
  readonly loadAssignableWorkers: AssignableWorkersLoader;
  readonly loadPhaseWorkerAssignments: PhaseWorkerAssignmentsLoader;
  readonly onCancelEdit: () => void;
  readonly onPhaseUpdated: (phase: PhaseResponseDto) => void;
  readonly onStartEdit: (phaseId: string) => void;
  readonly phase: PhaseResponseDto;
  readonly submitAssignWorkers: AssignPhaseWorkersSubmitter;
  readonly submitUpdatePhase: UpdatePhaseSubmitter;
}

function PhaseItem({
  isEditing,
  loadAssignableWorkers,
  loadPhaseWorkerAssignments,
  onCancelEdit,
  onPhaseUpdated,
  onStartEdit,
  phase,
  submitAssignWorkers,
  submitUpdatePhase,
}: PhaseItemProps) {
  return (
    <li className="rounded-md border border-border bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span
            aria-label={`Position ${String(phase.position)}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-sm font-semibold text-primary"
          >
            {phase.position}
          </span>
          <div className="min-w-0">
            <h4 className="break-words text-sm font-semibold tracking-normal">{phase.name}</h4>
            {phase.description ? (
              <p className="mt-1 break-words text-sm text-muted-foreground">{phase.description}</p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge tone="muted">{formatPhaseStatus(phase.status)}</Badge>
          <Button
            aria-expanded={isEditing}
            aria-label={`Modifier la phase ${phase.name}`}
            className="h-9 px-3"
            type="button"
            variant="secondary"
            onClick={() => {
              onStartEdit(phase.id);
            }}
          >
            <Pencil aria-hidden="true" className="h-4 w-4" />
            Modifier
          </Button>
        </div>
      </div>
      <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
        <PhaseMeta icon={Clock} label={formatDuration(phase.estimatedDurationDays)} />
        <PhaseMeta icon={CalendarDays} label={formatStartDate(phase.startDate)} />
      </div>
      {isEditing ? (
        <EditPhaseForm
          onCancel={onCancelEdit}
          onPhaseUpdated={onPhaseUpdated}
          phase={phase}
          submitUpdatePhase={submitUpdatePhase}
        />
      ) : null}
      <PhaseResourceAssignmentPanel
        loadAssignableWorkers={loadAssignableWorkers}
        loadPhaseWorkerAssignments={loadPhaseWorkerAssignments}
        phase={phase}
        submitAssignWorkers={submitAssignWorkers}
      />
    </li>
  );
}

interface PhaseMetaProps {
  readonly icon: LucideIcon;
  readonly label: string;
}

function PhaseMeta({ icon: Icon, label }: PhaseMetaProps) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
      <span className="break-words">{label}</span>
    </span>
  );
}

function formatDuration(durationDays: number | null): string {
  if (durationDays === null) {
    return "Durée non renseignée";
  }

  return durationDays === 1 ? "1 jour estimé" : `${String(durationDays)} jours estimés`;
}

function formatStartDate(startDate: string | null): string {
  if (startDate === null) {
    return "Date de début non renseignée";
  }

  return new Date(`${startDate}T00:00:00`).toLocaleDateString("fr-FR");
}

function formatPhaseStatus(status: string): string {
  if (status === "planned") {
    return "Planifiée";
  }

  return status;
}
