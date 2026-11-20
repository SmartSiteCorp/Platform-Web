import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { PhaseResponseDto, UpdatePhaseRequestDto } from "@/generated/api";

import type { CreatePhaseSubmitter } from "./create-phase-form";
import type { UpdatePhaseSubmitter } from "./edit-phase-form";
import type {
  AssignableWorkersLoader,
  AssignPhaseWorkersSubmitter,
  PhaseWorkerAssignmentsLoader,
} from "./phase-resource-assignment-panel";
import { SitePhasesSection } from "./site-phases-section";

const firstPhase: PhaseResponseDto = {
  createdAt: "2026-06-24T10:00:00.000Z",
  description: "Fondations et structure principale",
  estimatedDurationDays: 30,
  id: "phase-1",
  name: "Gros œuvre",
  position: 1,
  progressPercent: 0,
  siteId: "site-id",
  startDate: "2026-07-01",
  status: "planned",
  updatedAt: "2026-06-24T10:00:00.000Z",
};

const secondPhase: PhaseResponseDto = {
  ...firstPhase,
  description: null,
  estimatedDurationDays: 15,
  id: "phase-2",
  name: "Second œuvre",
  position: 2,
  startDate: null,
};

const updatedFirstPhase: PhaseResponseDto = {
  ...firstPhase,
  description: "Fondations ajustées",
  estimatedDurationDays: 28,
  name: "Gros œuvre ajusté",
  startDate: "2026-07-05",
  updatedAt: "2026-06-24T11:00:00.000Z",
};

describe("SitePhasesSection - creation", () => {
  it("affiche l'etat vide et le formulaire de creation", () => {
    renderSection(createQueuedSubmitter([firstPhase]));

    expect(screen.getByRole("heading", { name: "Phases chantier" })).toBeInTheDocument();
    expect(screen.getByText("Aucune phase créée pour ce chantier.")).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Formulaire création phase" })).toBeInTheDocument();
  });

  it("ajoute une phase creee et affiche ses informations", async () => {
    renderSection(createQueuedSubmitter([firstPhase]));

    fillAndSubmitPhaseForm("Gros œuvre", "30");

    expect(
      await screen.findByText(`"${firstPhase.name}" a été ajoutée avec succès.`),
    ).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Liste des phases chantier" })).toBeInTheDocument();
    expect(screen.getByText("Gros œuvre")).toBeInTheDocument();
    expect(screen.getByText("30 jours estimés")).toBeInTheDocument();
    expect(screen.getByText("01/07/2026")).toBeInTheDocument();
    expect(screen.getByLabelText("Position 1")).toBeInTheDocument();
    expect(screen.queryByText("Aucune phase créée pour ce chantier.")).not.toBeInTheDocument();
  });

  it("conserve l'ordre renvoye par le backend", async () => {
    const submitter = createQueuedSubmitter([secondPhase, firstPhase]);

    renderSection(submitter);
    fillAndSubmitPhaseForm("Second œuvre", "15");
    await screen.findByText(`"${secondPhase.name}" a été ajoutée avec succès.`);
    fillAndSubmitPhaseForm("Gros œuvre", "30");
    await screen.findByText(`"${firstPhase.name}" a été ajoutée avec succès.`);

    const list = screen.getByRole("list", { name: "Liste des phases chantier" });
    const items = within(list).getAllByRole("listitem");

    expect(items[0]).toHaveTextContent("Gros œuvre");
    expect(items[1]).toHaveTextContent("Second œuvre");
  });
});

describe("SitePhasesSection - modification", () => {
  it("modifie une phase existante et conserve sa position", async () => {
    let submittedUpdate: {
      readonly phaseId: string;
      readonly request: UpdatePhaseRequestDto;
    } | null = null;
    const updateSubmitter: UpdatePhaseSubmitter = (phaseId, request) => {
      submittedUpdate = { phaseId, request };
      return Promise.resolve({ ok: true, phase: updatedFirstPhase });
    };

    renderSection(createQueuedSubmitter([firstPhase]), updateSubmitter);
    fillAndSubmitPhaseForm("Gros œuvre", "30");
    await screen.findByText(`"${firstPhase.name}" a été ajoutée avec succès.`);

    fireEvent.click(screen.getByRole("button", { name: "Modifier la phase Gros œuvre" }));
    const editForm = screen.getByRole("form", {
      name: "Formulaire modification phase Gros œuvre",
    });

    fireEvent.change(within(editForm).getByLabelText("Nom de la phase"), {
      target: { value: "Gros œuvre ajusté" },
    });
    fireEvent.change(within(editForm).getByLabelText("Description (optionnel)"), {
      target: { value: "Fondations ajustées" },
    });
    fireEvent.change(within(editForm).getByLabelText("Date de début (optionnel)"), {
      target: { value: "2026-07-05" },
    });
    fireEvent.change(within(editForm).getByLabelText("Durée estimée en jours (optionnel)"), {
      target: { value: "28" },
    });
    fireEvent.click(within(editForm).getByRole("button", { name: "Enregistrer la phase" }));

    expect(
      await screen.findByText(`"${updatedFirstPhase.name}" a été mise à jour avec succès.`),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(submittedUpdate).toStrictEqual({
        phaseId: firstPhase.id,
        request: {
          description: "Fondations ajustées",
          estimatedDurationDays: 28,
          name: "Gros œuvre ajusté",
          startDate: "2026-07-05",
        },
      });
    });
    expect(screen.getByText("Gros œuvre ajusté")).toBeInTheDocument();
    expect(screen.getByText("28 jours estimés")).toBeInTheDocument();
    expect(screen.getByLabelText("Position 1")).toBeInTheDocument();
  });
});

describe("SitePhasesSection - etats", () => {
  it("affiche l'erreur de creation sans ajouter la phase", async () => {
    const submitter: CreatePhaseSubmitter = () =>
      Promise.resolve({ message: "Le chantier est introuvable.", ok: false });

    renderSection(submitter);
    fillAndSubmitPhaseForm("Gros œuvre", "30");

    expect(await screen.findByText("Le chantier est introuvable.")).toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: "Liste des phases chantier" }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["mobile (390px)", 390],
    ["tablette (768px)", 768],
  ])("reste utilisable en %s", (_label, width) => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: width });

    renderSection(createQueuedSubmitter([firstPhase]));

    expect(screen.getByLabelText("Nom de la phase")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Créer la phase" })).toBeInTheDocument();
  });
});

function renderSection(
  submitCreatePhase: CreatePhaseSubmitter,
  submitUpdatePhase: UpdatePhaseSubmitter = createUpdateSubmitter(updatedFirstPhase),
): void {
  render(
    <SitePhasesSection
      loadAssignableWorkers={createEmptyAssignableWorkersLoader()}
      loadPhaseWorkerAssignments={createEmptyPhaseWorkerAssignmentsLoader()}
      submitAssignWorkers={createAssignWorkersSubmitter()}
      submitCreatePhase={submitCreatePhase}
      submitUpdatePhase={submitUpdatePhase}
    />,
  );
}

function createQueuedSubmitter(phases: readonly PhaseResponseDto[]): CreatePhaseSubmitter {
  let nextPhaseIndex = 0;

  return () => {
    const phase = phases[nextPhaseIndex] ?? phases.at(-1);
    nextPhaseIndex += 1;

    if (!phase) {
      return Promise.resolve({ message: "Aucune phase de test disponible.", ok: false });
    }

    return Promise.resolve({ ok: true, phase });
  };
}

function fillAndSubmitPhaseForm(name: string, estimatedDurationDays: string): void {
  fireEvent.change(screen.getByLabelText("Nom de la phase"), {
    target: { value: name },
  });
  fireEvent.change(screen.getByLabelText("Durée estimée en jours (optionnel)"), {
    target: { value: estimatedDurationDays },
  });
  fireEvent.click(screen.getByRole("button", { name: "Créer la phase" }));
}

function createUpdateSubmitter(phase: PhaseResponseDto): UpdatePhaseSubmitter {
  return () => Promise.resolve({ ok: true, phase });
}

function createEmptyAssignableWorkersLoader(): AssignableWorkersLoader {
  return (siteId) => Promise.resolve({ ok: true, siteId, workers: [] });
}

function createEmptyPhaseWorkerAssignmentsLoader(): PhaseWorkerAssignmentsLoader {
  return (siteId, phaseId) => Promise.resolve({ assignments: [], ok: true, phaseId, siteId });
}

function createAssignWorkersSubmitter(): AssignPhaseWorkersSubmitter {
  return (siteId, phaseId) => Promise.resolve({ assignments: [], ok: true, phaseId, siteId });
}
