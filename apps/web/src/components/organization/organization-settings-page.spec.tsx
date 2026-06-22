import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { readAuthSession, saveAuthSession } from "@/lib/auth-session";
import { createTestAccessToken } from "@/test/create-test-access-token";
import {
  fillInvitationForm,
  fillOrganizationForm,
  expectRouterRedirectTo,
  getOrganizationSettingsForm,
  organization,
  registeredAccount,
  renderDefaultOrganizationSettingsPage,
  renderOrganizationSettingsPageWithLoader,
  renderReadyPage,
  resetOrganizationSettingsPageTest,
  responsiveViewports,
  setViewportWidth,
} from "./organization-settings-page.test-utils";

describe("OrganizationSettingsPage - affichage", () => {
  beforeEach(() => {
    resetOrganizationSettingsPageTest();
  });

  it("affiche les donnees actuelles de l'entreprise", async () => {
    renderReadyPage();

    expect(await screen.findByDisplayValue("Stern Tech")).toBeInTheDocument();
    expect(screen.getByDisplayValue("contact@smartsite.fr")).toBeInTheDocument();
    expect(screen.getByDisplayValue("+33123456789")).toBeInTheDocument();
    expect(screen.getByDisplayValue("12 rue des Chantiers, Paris")).toBeInTheDocument();
    expect(screen.getByText("Aperçu organisation")).toBeInTheDocument();
    expect(
      screen.getByRole("form", { name: "Formulaire invitation utilisateur" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Espace responsive paramètres")).toHaveClass(
      "lg:grid-cols-[1fr_22rem]",
    );
  });

  it.each(responsiveViewports)("garde la page utilisable en %s", async (_label, width) => {
    setViewportWidth(width);
    renderReadyPage();

    expect(await screen.findByDisplayValue("Stern Tech")).toBeInTheDocument();
    const organizationForm = getOrganizationSettingsForm();

    expect(within(organizationForm).getByLabelText("Nom entreprise")).toBeInTheDocument();
    expect(within(organizationForm).getByLabelText("Email")).toBeInTheDocument();
    expect(within(organizationForm).getByLabelText("Téléphone")).toBeInTheDocument();
    expect(within(organizationForm).getByLabelText("Adresse")).toBeInTheDocument();
    expect(screen.getByText("Aperçu organisation")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeEnabled();
    expect(screen.getByLabelText("Espace responsive paramètres")).toHaveClass(
      "grid",
      "gap-6",
      "lg:grid-cols-[1fr_22rem]",
    );
  });
});

describe("OrganizationSettingsPage - formulaire", () => {
  beforeEach(() => {
    resetOrganizationSettingsPageTest();
  });

  it("bloque un email invalide avant l'appel API", async () => {
    const { getSubmittedUpdate } = renderReadyPage();

    await screen.findByDisplayValue("Stern Tech");
    fireEvent.change(within(getOrganizationSettingsForm()).getByLabelText("Email"), {
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
});

describe("OrganizationSettingsPage - invitations", () => {
  beforeEach(() => {
    resetOrganizationSettingsPageTest();
  });

  it("envoie une invitation utilisateur depuis l'organisation courante", async () => {
    const { getSubmittedInvitation } = renderReadyPage();

    await screen.findByDisplayValue("Stern Tech");
    fillInvitationForm();
    fireEvent.click(screen.getByRole("button", { name: "Envoyer l'invitation" }));

    await waitFor(() => {
      expect(getSubmittedInvitation()).toStrictEqual({
        organizationId: "organization-id",
        request: {
          email: "ouvrier@smartsite.fr",
          roleCodes: ["ouvrier"],
        },
      });
    });
    expect(
      await screen.findByText("Invitation prête pour ouvrier@smartsite.fr."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Lien d'invitation")).toHaveValue(
      new URL("/invitations/accept?token=invitation-token", window.location.origin).toString(),
    );
  });

  it("redirige vers la connexion si la session expire pendant l'invitation", async () => {
    const { getSubmittedInvitation } = renderReadyPage({
      submitInvitationResult: {
        message: "Votre session a expiré. Connectez-vous à nouveau.",
        ok: false,
        sessionExpired: true,
      },
    });

    await screen.findByDisplayValue("Stern Tech");
    fillInvitationForm();
    fireEvent.click(screen.getByRole("button", { name: "Envoyer l'invitation" }));

    await waitFor(() => {
      expectRouterRedirectTo("/login");
    });
    expect(getSubmittedInvitation()).toStrictEqual({
      organizationId: "organization-id",
      request: {
        email: "ouvrier@smartsite.fr",
        roleCodes: ["ouvrier"],
      },
    });
    expect(readAuthSession()).toBeNull();
  });
});

describe("OrganizationSettingsPage - session", () => {
  beforeEach(() => {
    resetOrganizationSettingsPageTest();
  });

  it("affiche un acces bloque si la session est absente", async () => {
    let loadCallCount = 0;
    const loadOrganizationDetails = () => {
      loadCallCount += 1;
      return Promise.resolve({ ok: true as const, organization });
    };

    renderOrganizationSettingsPageWithLoader(loadOrganizationDetails);

    expect(await screen.findByText("Session requise")).toBeInTheDocument();
    expect(loadCallCount).toBe(0);
  });

  it("supprime la session expiree et redirige vers la connexion", async () => {
    saveAuthSession({
      ...registeredAccount,
      accessToken: createTestAccessToken(Math.floor(Date.now() / 1000) - 1),
    });

    renderDefaultOrganizationSettingsPage();

    await waitFor(() => {
      expectRouterRedirectTo("/login");
    });
    expect(readAuthSession()).toBeNull();
  });
});
