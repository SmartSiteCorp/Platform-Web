import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { CreateSiteRequestDto, SiteResponseDto } from "@/generated/api";
import { CreateSiteForm, type CreateSiteSubmitter } from "./create-site-form";

const createdSite: SiteResponseDto = {
  address: null,
  createdAt: "2026-06-23T10:00:00.000Z",
  createdBy: "user-id",
  estimatedDurationDays: null,
  id: "site-id",
  name: "Chantier Test",
  organizationId: "org-id",
  startDate: null,
  status: "planned",
  updatedAt: "2026-06-23T10:00:00.000Z",
};

describe("CreateSiteForm - champs", () => {
  it("affiche tous les champs du formulaire", () => {
    renderForm(createSuccessSubmitter());

    expect(screen.getByLabelText("Nom du chantier")).toBeInTheDocument();
    expect(screen.getByLabelText("Adresse (optionnel)")).toBeInTheDocument();
    expect(screen.getByLabelText("Date de début (optionnel)")).toBeInTheDocument();
    expect(screen.getByLabelText("Durée estimée en jours (optionnel)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Créer le chantier" })).toBeInTheDocument();
  });

  it("bloque la soumission si le nom est vide", async () => {
    let submitCount = 0;
    const submitter: CreateSiteSubmitter = () => {
      submitCount += 1;
      return Promise.resolve({ ok: true, site: createdSite });
    };

    renderForm(submitter);
    fireEvent.click(screen.getByRole("button", { name: "Créer le chantier" }));

    expect(await screen.findByText("Le nom du chantier est obligatoire.")).toBeInTheDocument();
    expect(submitCount).toBe(0);
  });

  it("bloque une duree estimee inferieure a 1", async () => {
    let submitCount = 0;
    const submitter: CreateSiteSubmitter = () => {
      submitCount += 1;
      return Promise.resolve({ ok: true, site: createdSite });
    };

    renderForm(submitter);
    fillValidForm({ estimatedDurationDays: "0" });
    fireEvent.click(screen.getByRole("button", { name: "Créer le chantier" }));

    expect(
      await screen.findByText("La durée estimée doit être d'au moins 1 jour."),
    ).toBeInTheDocument();
    expect(submitCount).toBe(0);
  });
});

describe("CreateSiteForm - soumission", () => {
  it("soumet un payload normalise et declenche onSiteCreated", async () => {
    let submittedRequest: CreateSiteRequestDto | null = null;
    const submitter: CreateSiteSubmitter = (request) => {
      submittedRequest = request;
      return Promise.resolve({ ok: true, site: createdSite });
    };
    const { getCreatedSite } = renderForm(submitter);

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Créer le chantier" }));

    await waitFor(() => {
      expect(getCreatedSite()).toStrictEqual(createdSite);
    });
    expect(submittedRequest).toStrictEqual({
      address: "12 rue des Artisans",
      estimatedDurationDays: 30,
      name: "Chantier Tour Horizon",
      startDate: "2026-07-01",
    });
  });

  it("soumet avec uniquement le nom quand les champs optionnels sont vides", async () => {
    let submittedRequest: CreateSiteRequestDto | null = null;
    const submitter: CreateSiteSubmitter = (request) => {
      submittedRequest = request;
      return Promise.resolve({ ok: true, site: createdSite });
    };
    renderForm(submitter);

    fireEvent.change(screen.getByLabelText("Nom du chantier"), {
      target: { value: "Chantier Minimal" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Créer le chantier" }));

    await waitFor(() => {
      expect(submittedRequest).toBeDefined();
    });
    expect(submittedRequest).toStrictEqual({
      address: null,
      estimatedDurationDays: null,
      name: "Chantier Minimal",
      startDate: null,
    });
  });

  it("affiche l'erreur API sans declencher onSiteCreated", async () => {
    const submitter: CreateSiteSubmitter = () =>
      Promise.resolve({ message: "Vous n'avez pas le rôle requis.", ok: false });
    const { getCreatedSite } = renderForm(submitter);

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Créer le chantier" }));

    expect(await screen.findByText("Vous n'avez pas le rôle requis.")).toBeInTheDocument();
    expect(getCreatedSite()).toBeNull();
  });
});

function renderForm(submitCreateSite: CreateSiteSubmitter): {
  readonly getCreatedSite: () => SiteResponseDto | null;
} {
  let createdSiteResult: SiteResponseDto | null = null;

  render(
    <CreateSiteForm
      onSiteCreated={(site) => {
        createdSiteResult = site;
      }}
      submitCreateSite={submitCreateSite}
    />,
  );

  return { getCreatedSite: () => createdSiteResult };
}

function createSuccessSubmitter(): CreateSiteSubmitter {
  return () => Promise.resolve({ ok: true, site: createdSite });
}

interface CreateSiteFormFixture {
  readonly address: string;
  readonly estimatedDurationDays: string;
  readonly name: string;
  readonly startDate: string;
}

const createSiteFormFixture: CreateSiteFormFixture = {
  address: "12 rue des Artisans",
  estimatedDurationDays: "30",
  name: "Chantier Tour Horizon",
  startDate: "2026-07-01",
};

function fillValidForm(overrides: Partial<CreateSiteFormFixture> = {}): void {
  const fixture = { ...createSiteFormFixture, ...overrides };

  fireEvent.change(screen.getByLabelText("Nom du chantier"), {
    target: { value: fixture.name },
  });
  fireEvent.change(screen.getByLabelText("Adresse (optionnel)"), {
    target: { value: fixture.address },
  });
  fireEvent.change(screen.getByLabelText("Date de début (optionnel)"), {
    target: { value: fixture.startDate },
  });
  fireEvent.change(screen.getByLabelText("Durée estimée en jours (optionnel)"), {
    target: { value: fixture.estimatedDurationDays },
  });
}
