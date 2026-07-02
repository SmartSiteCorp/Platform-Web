import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { PhaseResponseDto } from "@/generated/api";

import type { CreatePhaseSubmitter } from "./create-phase-form";
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

describe("SitePhasesSection", () => {
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

function renderSection(submitCreatePhase: CreatePhaseSubmitter): void {
  render(<SitePhasesSection submitCreatePhase={submitCreatePhase} />);
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
