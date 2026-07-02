import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { CreatePhaseRequestDto, PhaseResponseDto } from "@/generated/api";

import { CreatePhaseForm, type CreatePhaseSubmitter } from "./create-phase-form";

const createdPhase: PhaseResponseDto = {
  createdAt: "2026-06-24T10:00:00.000Z",
  description: "Fondations et structure principale",
  estimatedDurationDays: 30,
  id: "phase-id",
  name: "Gros œuvre",
  position: 1,
  progressPercent: 0,
  siteId: "site-id",
  startDate: "2026-07-01",
  status: "planned",
  updatedAt: "2026-06-24T10:00:00.000Z",
};

describe("CreatePhaseForm - champs", () => {
  it("affiche tous les champs du formulaire", () => {
    renderForm(createSuccessSubmitter());

    expect(screen.getByLabelText("Nom de la phase")).toBeInTheDocument();
    expect(screen.getByLabelText("Description (optionnel)")).toBeInTheDocument();
    expect(screen.getByLabelText("Date de début (optionnel)")).toBeInTheDocument();
    expect(screen.getByLabelText("Durée estimée en jours (optionnel)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Créer la phase" })).toBeInTheDocument();
  });

  it("bloque la soumission si le nom est vide", async () => {
    let submitCount = 0;
    const submitter: CreatePhaseSubmitter = () => {
      submitCount += 1;
      return Promise.resolve({ ok: true, phase: createdPhase });
    };

    renderForm(submitter);
    fireEvent.click(screen.getByRole("button", { name: "Créer la phase" }));

    expect(await screen.findByText("Le nom de la phase est obligatoire.")).toBeInTheDocument();
    expect(submitCount).toBe(0);
  });

  it("bloque une duree estimee inferieure a 1", async () => {
    let submitCount = 0;
    const submitter: CreatePhaseSubmitter = () => {
      submitCount += 1;
      return Promise.resolve({ ok: true, phase: createdPhase });
    };

    renderForm(submitter);
    fillValidForm({ estimatedDurationDays: "0" });
    fireEvent.click(screen.getByRole("button", { name: "Créer la phase" }));

    expect(
      await screen.findByText("La durée estimée doit être d'au moins 1 jour."),
    ).toBeInTheDocument();
    expect(submitCount).toBe(0);
  });
});

describe("CreatePhaseForm - soumission", () => {
  it("soumet un payload normalise et declenche onPhaseCreated", async () => {
    let submittedRequest: CreatePhaseRequestDto | null = null;
    const submitter: CreatePhaseSubmitter = (request) => {
      submittedRequest = request;
      return Promise.resolve({ ok: true, phase: createdPhase });
    };
    const { getCreatedPhase } = renderForm(submitter);

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Créer la phase" }));

    await waitFor(() => {
      expect(getCreatedPhase()).toStrictEqual(createdPhase);
    });
    expect(submittedRequest).toStrictEqual({
      description: "Fondations et structure principale",
      estimatedDurationDays: 30,
      name: "Gros œuvre",
      startDate: "2026-07-01",
    });
    expect(
      screen.getByText(`"${createdPhase.name}" a été ajoutée avec succès.`),
    ).toBeInTheDocument();
  });

  it("soumet avec uniquement le nom quand les champs optionnels sont vides", async () => {
    let submittedRequest: CreatePhaseRequestDto | null = null;
    const submitter: CreatePhaseSubmitter = (request) => {
      submittedRequest = request;
      return Promise.resolve({ ok: true, phase: createdPhase });
    };

    renderForm(submitter);
    fireEvent.change(screen.getByLabelText("Nom de la phase"), {
      target: { value: "Phase minimale" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Créer la phase" }));

    await waitFor(() => {
      expect(submittedRequest).toBeDefined();
    });
    expect(submittedRequest).toStrictEqual({
      description: null,
      estimatedDurationDays: null,
      name: "Phase minimale",
      startDate: null,
    });
  });

  it("affiche l'erreur API sans declencher onPhaseCreated", async () => {
    const submitter: CreatePhaseSubmitter = () =>
      Promise.resolve({ message: "Vous n'avez pas le rôle requis.", ok: false });
    const { getCreatedPhase } = renderForm(submitter);

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Créer la phase" }));

    expect(await screen.findByText("Vous n'avez pas le rôle requis.")).toBeInTheDocument();
    expect(getCreatedPhase()).toBeNull();
  });
});

function renderForm(submitCreatePhase: CreatePhaseSubmitter): {
  readonly getCreatedPhase: () => PhaseResponseDto | null;
} {
  let createdPhaseResult: PhaseResponseDto | null = null;

  render(
    <CreatePhaseForm
      onPhaseCreated={(phase) => {
        createdPhaseResult = phase;
      }}
      submitCreatePhase={submitCreatePhase}
    />,
  );

  return { getCreatedPhase: () => createdPhaseResult };
}

function createSuccessSubmitter(): CreatePhaseSubmitter {
  return () => Promise.resolve({ ok: true, phase: createdPhase });
}

interface CreatePhaseFormFixture {
  readonly description: string;
  readonly estimatedDurationDays: string;
  readonly name: string;
  readonly startDate: string;
}

const createPhaseFormFixture: CreatePhaseFormFixture = {
  description: "Fondations et structure principale",
  estimatedDurationDays: "30",
  name: "Gros œuvre",
  startDate: "2026-07-01",
};

function fillValidForm(overrides: Partial<CreatePhaseFormFixture> = {}): void {
  const fixture = { ...createPhaseFormFixture, ...overrides };

  fireEvent.change(screen.getByLabelText("Nom de la phase"), {
    target: { value: fixture.name },
  });
  fireEvent.change(screen.getByLabelText("Description (optionnel)"), {
    target: { value: fixture.description },
  });
  fireEvent.change(screen.getByLabelText("Date de début (optionnel)"), {
    target: { value: fixture.startDate },
  });
  fireEvent.change(screen.getByLabelText("Durée estimée en jours (optionnel)"), {
    target: { value: fixture.estimatedDurationDays },
  });
}
