import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type {
  AssignableWorkerResponseDto,
  PhaseResponseDto,
  PhaseWorkerAssignmentResponseDto,
} from "@/generated/api";

import {
  PhaseResourceAssignmentPanel,
  type AssignableWorkersLoader,
  type AssignPhaseWorkersSubmitter,
  type PhaseWorkerAssignmentsLoader,
} from "./phase-resource-assignment-panel";

const phase: PhaseResponseDto = {
  createdAt: "2026-06-24T10:00:00.000Z",
  description: null,
  estimatedDurationDays: 10,
  id: "phase-id",
  name: "Gros œuvre",
  position: 1,
  progressPercent: 0,
  siteId: "site-id",
  startDate: null,
  status: "planned",
  updatedAt: "2026-06-24T10:00:00.000Z",
};

const worker: AssignableWorkerResponseDto = {
  firstName: "Armand",
  lastName: "Braud",
  workerUserId: "worker-id",
};

const assignment: PhaseWorkerAssignmentResponseDto = {
  assignedAt: "2026-07-02T10:00:00.000Z",
  phaseId: phase.id,
  siteId: phase.siteId,
  workerFirstName: worker.firstName,
  workerLastName: worker.lastName,
  workerUserId: worker.workerUserId,
};

describe("PhaseResourceAssignmentPanel", () => {
  it("affiche le chargement des ouvriers", () => {
    const pendingAssignableWorkersLoader: AssignableWorkersLoader = () =>
      new Promise<never>(() => undefined);
    const pendingAssignmentsLoader: PhaseWorkerAssignmentsLoader = () =>
      new Promise<never>(() => undefined);

    renderPanel({
      loadAssignableWorkers: pendingAssignableWorkersLoader,
      loadPhaseWorkerAssignments: pendingAssignmentsLoader,
    });

    expect(screen.getByText("Chargement des ouvriers...")).toBeInTheDocument();
  });

  it("affiche les etats vides", async () => {
    renderPanel({ assignments: [], workers: [] });

    expect(await screen.findByText("Aucun ouvrier assigné à cette phase.")).toBeInTheDocument();
    expect(screen.getByText("Aucun ouvrier disponible pour ce chantier.")).toBeInTheDocument();
  });

  it("affiche une erreur de chargement", async () => {
    const failingAssignableWorkersLoader: AssignableWorkersLoader = () =>
      Promise.resolve({ message: "Le chantier est introuvable.", ok: false });

    renderPanel({ loadAssignableWorkers: failingAssignableWorkersLoader });

    expect(await screen.findByText("Le chantier est introuvable.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
  });

  it("valide la selection d'au moins un ouvrier", async () => {
    const submitter = vi.fn<AssignPhaseWorkersSubmitter>();

    renderPanel({ submitAssignWorkers: submitter, workers: [worker] });

    await screen.findByLabelText("Sélectionner Armand Braud");
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer les affectations" }));

    expect(await screen.findByText("Sélectionnez au moins un ouvrier.")).toBeInTheDocument();
    expect(submitter).not.toHaveBeenCalled();
  });

  it("assigne un ouvrier selectionne et affiche le succes", async () => {
    const submitter = vi.fn<AssignPhaseWorkersSubmitter>().mockResolvedValue({
      assignments: [assignment],
      ok: true,
      phaseId: phase.id,
      siteId: phase.siteId,
    });

    renderPanel({ submitAssignWorkers: submitter, workers: [worker] });

    fireEvent.click(await screen.findByLabelText("Sélectionner Armand Braud"));
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer les affectations" }));

    await waitFor(() => {
      expect(submitter).toHaveBeenCalledWith(phase.siteId, phase.id, [worker.workerUserId]);
    });
    expect(await screen.findByText("Affectations enregistrées.")).toBeInTheDocument();
    const assignedWorkersList = screen.getByRole("list", {
      name: "Ouvriers assignés à Gros œuvre",
    });

    expect(within(assignedWorkersList).getByText("Armand Braud")).toBeInTheDocument();
    expect(screen.getByLabelText("Armand Braud déjà assigné")).toBeDisabled();
  });

  it("affiche une erreur d'assignation", async () => {
    const submitter = vi.fn<AssignPhaseWorkersSubmitter>().mockResolvedValue({
      message: "Vous n'avez pas le rôle requis pour assigner des ouvriers.",
      ok: false,
    });

    renderPanel({ submitAssignWorkers: submitter, workers: [worker] });

    fireEvent.click(await screen.findByLabelText("Sélectionner Armand Braud"));
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer les affectations" }));

    expect(
      await screen.findByText("Vous n'avez pas le rôle requis pour assigner des ouvriers."),
    ).toBeInTheDocument();
  });
});

interface RenderPanelOptions {
  readonly assignments?: readonly PhaseWorkerAssignmentResponseDto[];
  readonly loadAssignableWorkers?: AssignableWorkersLoader;
  readonly loadPhaseWorkerAssignments?: PhaseWorkerAssignmentsLoader;
  readonly submitAssignWorkers?: AssignPhaseWorkersSubmitter;
  readonly workers?: readonly AssignableWorkerResponseDto[];
}

function renderPanel(options: RenderPanelOptions = {}): void {
  const workers = options.workers ?? [worker];
  const assignments = options.assignments ?? [];

  render(
    <PhaseResourceAssignmentPanel
      loadAssignableWorkers={options.loadAssignableWorkers ?? createWorkersLoader(workers)}
      loadPhaseWorkerAssignments={
        options.loadPhaseWorkerAssignments ?? createAssignmentsLoader(assignments)
      }
      phase={phase}
      submitAssignWorkers={options.submitAssignWorkers ?? createSuccessSubmitter(assignments)}
    />,
  );
}

function createWorkersLoader(
  workers: readonly AssignableWorkerResponseDto[],
): AssignableWorkersLoader {
  return () => Promise.resolve({ ok: true, siteId: phase.siteId, workers });
}

function createAssignmentsLoader(
  assignments: readonly PhaseWorkerAssignmentResponseDto[],
): PhaseWorkerAssignmentsLoader {
  return () =>
    Promise.resolve({
      assignments,
      ok: true,
      phaseId: phase.id,
      siteId: phase.siteId,
    });
}

function createSuccessSubmitter(
  assignments: readonly PhaseWorkerAssignmentResponseDto[],
): AssignPhaseWorkersSubmitter {
  return () => Promise.resolve({ assignments, ok: true, phaseId: phase.id, siteId: phase.siteId });
}
