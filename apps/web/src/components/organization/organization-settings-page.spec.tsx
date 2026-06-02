import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  OrganizationResponseDto,
  RegisterResponseDto,
  UpdateOrganizationRequestDto,
} from "@/generated/api";
import { readAuthSession, saveAuthSession } from "@/lib/auth-session";
import type { OrganizationSettingsResult } from "@/lib/organization-settings";
import { createTestAccessToken } from "@/test/create-test-access-token";
import {
  OrganizationSettingsPage,
  type OrganizationSettingsLoader,
  type OrganizationSettingsSubmitter,
} from "./organization-settings-page";

const routerMock = vi.hoisted(() => ({
  replace: vi.fn<(url: string) => void>(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

interface SubmittedOrganizationUpdate {
  readonly organizationId: string;
  readonly request: UpdateOrganizationRequestDto;
}

interface RenderReadyPageOptions {
  readonly loadResult?: OrganizationSettingsResult;
  readonly submitResult?: OrganizationSettingsResult;
}

const registeredAccount: RegisterResponseDto = {
  accessToken: createTestAccessToken(Math.floor(Date.now() / 1000) + 3600),
  organization: {
    createdAt: "2026-06-01T10:00:00.000Z",
    email: "contact@smartsite.fr",
    id: "organization-id",
    name: "Stern Tech",
  },
  tokenType: "Bearer",
  user: {
    createdAt: "2026-06-01T10:00:00.000Z",
    email: "andreea@smartsite.fr",
    firstName: "Andreea",
    id: "user-id",
    lastName: "Rauta",
    organizationId: "organization-id",
    phone: null,
    roles: ["administrateur"],
    status: "active",
  },
};

const organization: OrganizationResponseDto = {
  address: "12 rue des Chantiers, Paris",
  createdAt: "2026-06-01T10:00:00.000Z",
  email: "contact@smartsite.fr",
  id: "organization-id",
  name: "Stern Tech",
  phone: "+33123456789",
  updatedAt: "2026-06-01T10:00:00.000Z",
};

const updatedOrganization: OrganizationResponseDto = {
  ...organization,
  address: "14 rue du Chantier, Lyon",
  email: "contact@smartsite.fr",
  name: "Stern Tech Renovation",
  phone: null,
  updatedAt: "2026-06-02T09:00:00.000Z",
};

describe("OrganizationSettingsPage", () => {
  beforeEach(() => {
    routerMock.replace.mockClear();
    window.localStorage.clear();
  });

  it("affiche les donnees actuelles de l'entreprise", async () => {
    renderReadyPage();

    expect(await screen.findByDisplayValue("Stern Tech")).toBeInTheDocument();
    expect(screen.getByDisplayValue("contact@smartsite.fr")).toBeInTheDocument();
    expect(screen.getByDisplayValue("+33123456789")).toBeInTheDocument();
    expect(screen.getByDisplayValue("12 rue des Chantiers, Paris")).toBeInTheDocument();
    expect(screen.getByText("Aperçu organisation")).toBeInTheDocument();
    expect(screen.getByLabelText("Espace responsive paramètres")).toHaveClass(
      "lg:grid-cols-[1fr_22rem]",
    );
  });

  it("bloque un email invalide avant l'appel API", async () => {
    const { getSubmittedUpdate } = renderReadyPage();

    fireEvent.change(await screen.findByLabelText("Email"), {
      target: { value: "email-invalide" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(await screen.findByText("L'email doit être valide.")).toBeInTheDocument();
    expect(getSubmittedUpdate()).toBeNull();
  });

  it("envoie une demande normalisee et met a jour la session", async () => {
    const { getSubmittedUpdate } = renderReadyPage();

    await screen.findByDisplayValue("Stern Tech");
    fillOrganizationForm();
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => {
      expect(getSubmittedUpdate()).toStrictEqual({
        organizationId: "organization-id",
        request: {
          address: "14 rue du Chantier, Lyon",
          email: "contact@smartsite.fr",
          name: "Stern Tech Renovation",
          phone: null,
        },
      });
    });
    expect(await screen.findByText("Informations entreprise mises à jour.")).toBeInTheDocument();
    expect(readAuthSession()?.organization.name).toBe("Stern Tech Renovation");
  });

  it("affiche les erreurs retournees par l'API", async () => {
    renderReadyPage({
      submitResult: { message: "Accès organisation interdit.", ok: false },
    });

    await screen.findByDisplayValue("Stern Tech");
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(await screen.findByText("Accès organisation interdit.")).toBeInTheDocument();
  });

  it("affiche un acces bloque si la session est absente", async () => {
    let loadCallCount = 0;
    const loadOrganizationDetails: OrganizationSettingsLoader = () => {
      loadCallCount += 1;
      return Promise.resolve({ ok: true, organization });
    };

    render(<OrganizationSettingsPage loadOrganizationDetails={loadOrganizationDetails} />);

    expect(await screen.findByText("Session requise")).toBeInTheDocument();
    expect(loadCallCount).toBe(0);
  });

  it("supprime la session expiree et redirige vers la connexion", async () => {
    saveAuthSession({
      ...registeredAccount,
      accessToken: createTestAccessToken(Math.floor(Date.now() / 1000) - 1),
    });

    render(<OrganizationSettingsPage />);

    await waitFor(() => {
      expect(routerMock.replace).toHaveBeenCalledWith("/login");
    });
    expect(readAuthSession()).toBeNull();
  });
});

function renderReadyPage({
  loadResult = { ok: true, organization },
  submitResult = { ok: true, organization: updatedOrganization },
}: RenderReadyPageOptions = {}): {
  readonly getSubmittedUpdate: () => SubmittedOrganizationUpdate | null;
} {
  let submittedUpdate: SubmittedOrganizationUpdate | null = null;
  saveAuthSession(registeredAccount);

  const loadOrganizationDetails: OrganizationSettingsLoader = () => Promise.resolve(loadResult);
  const submitOrganizationSettings: OrganizationSettingsSubmitter = (
    _session,
    organizationId,
    request,
  ) => {
    submittedUpdate = { organizationId, request };
    return Promise.resolve(submitResult);
  };

  render(
    <OrganizationSettingsPage
      loadOrganizationDetails={loadOrganizationDetails}
      submitOrganizationSettings={submitOrganizationSettings}
    />,
  );

  return {
    getSubmittedUpdate: () => submittedUpdate,
  };
}

function fillOrganizationForm(): void {
  fireEvent.change(screen.getByLabelText("Nom entreprise"), {
    target: { value: " Stern Tech Renovation " },
  });
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: " CONTACT@SMARTSITE.FR " },
  });
  fireEvent.change(screen.getByLabelText("Téléphone"), { target: { value: " " } });
  fireEvent.change(screen.getByLabelText("Adresse"), {
    target: { value: " 14 rue du Chantier, Lyon " },
  });
}
