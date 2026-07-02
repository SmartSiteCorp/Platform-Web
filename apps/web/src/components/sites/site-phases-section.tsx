"use client";

import { CalendarDays, Clock, ListOrdered, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PhaseResponseDto } from "@/generated/api";

import { CreatePhaseForm, type CreatePhaseSubmitter } from "./create-phase-form";

interface SitePhasesSectionProps {
  readonly submitCreatePhase: CreatePhaseSubmitter;
}

export function SitePhasesSection({ submitCreatePhase }: SitePhasesSectionProps) {
  const [phases, setPhases] = useState<readonly PhaseResponseDto[]>([]);

  const handlePhaseCreated = (phase: PhaseResponseDto): void => {
    setPhases((prev) => [...prev, phase].sort(comparePhasePosition));
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
        <PhaseList phases={phases} />
      </CardContent>
    </Card>
  );
}

function comparePhasePosition(first: PhaseResponseDto, second: PhaseResponseDto): number {
  return first.position - second.position;
}

interface PhaseListProps {
  readonly phases: readonly PhaseResponseDto[];
}

function PhaseList({ phases }: PhaseListProps) {
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
        <PhaseItem key={phase.id} phase={phase} />
      ))}
    </ol>
  );
}

interface PhaseItemProps {
  readonly phase: PhaseResponseDto;
}

function PhaseItem({ phase }: PhaseItemProps) {
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
        <Badge tone="muted">{formatPhaseStatus(phase.status)}</Badge>
      </div>
      <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
        <PhaseMeta icon={Clock} label={formatDuration(phase.estimatedDurationDays)} />
        <PhaseMeta icon={CalendarDays} label={formatStartDate(phase.startDate)} />
      </div>
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
