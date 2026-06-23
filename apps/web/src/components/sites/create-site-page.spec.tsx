import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RegisterResponseDto, SiteResponseDto } from "@/generated/api";
import { createTestAccessToken } from "@/test/create-test-access-token";
import { CreateSitePage } from "./create-site-page";
import type { CreateSiteSubmitter } from "./create-site-form";

const routerMock = vi.hoisted(() => ({
  push: vi.fn<(url: string) => void>(),
  replace: vi.fn<(url: string) => void>(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

const sessionMock = vi.hoisted(() => ({
  isCheckingSession: false,
  session: null as RegisterResponseDto | null,
}));

vi.mock("@/lib/use-auth-session", () => ({
  useRequiredAuthSession: () => sessionMock,
}));

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

const registeredAccount: RegisterResponseDto = {
  accessToken: createTestAccessToken(Math.floor(Date.now() / 1000) + 3600),
  organization: {
    createdAt: "2026-06-01T10:00:00.000Z",
    email: "andreea@smartsite.fr",
    id: "org-id",
    name: "Stern Tech",
  },
  tokenType: "Bearer",
  user: {
    createdAt: "2026-06-01T10:00:00.000Z",
    email: "andreea@smartsite.fr",
    firstName: "Andreea",
    id: "user-id",
    lastName: "Rauta",
    organizationId: "org-id",
    phone: null,
    roles: ["chef_chantier"],
    status: "active",
  },
};

describe("CreateSitePage", () => {
  beforeEach(() => {
    routerMock.push.mockClear();
    routerMock.replace.mockClear();
    sessionMock.isCheckingSession = false;
    sessionMock.session = registeredAccount;
  });

  it("affiche le formulaire de creation de chantier", () => {
    renderPage(createSuccessSubmitter());

    expect(screen.getByRole("heading", { name: "Créer un chantier" })).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Formulaire création chantier" })).toBeInTheDocument();
  });

  it("affiche le champ nom du chantier", () => {
    renderPage(createSuccessSubmitter());

    expect(screen.getByLabelText("Nom du chantier")).toBeInTheDocument();
  });

  it("affiche les champs optionnels adresse date et duree", () => {
    renderPage(createSuccessSubmitter());

    expect(screen.getByLabelText("Adresse (optionnel)")).toBeInTheDocument();
    expect(screen.getByLabelText("Date de début (optionnel)")).toBeInTheDocument();
    expect(screen.getByLabelText("Durée estimée en jours (optionnel)")).toBeInTheDocument();
  });

  it("affiche le bouton de soumission", () => {
    renderPage(createSuccessSubmitter());

    expect(screen.getByRole("button", { name: "Créer le chantier" })).toBeInTheDocument();
  });

  it("affiche le spinner de chargement pendant la verification de session", () => {
    sessionMock.isCheckingSession = true;
    sessionMock.session = null;

    renderPage(createSuccessSubmitter());

    expect(screen.getByText("Vérification de la session...")).toBeInTheDocument();
    expect(
      screen.queryByRole("form", { name: "Formulaire création chantier" }),
    ).not.toBeInTheDocument();
  });
});

function renderPage(submitCreateSite: CreateSiteSubmitter): void {
  render(<CreateSitePage submitCreateSite={submitCreateSite} />);
}

function createSuccessSubmitter(): CreateSiteSubmitter {
  return () => Promise.resolve({ ok: true, site: createdSite });
}
