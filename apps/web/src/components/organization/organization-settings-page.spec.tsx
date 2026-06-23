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
      screen.queryByRole("form", { name: "Formulaire invitation utilisateur" }),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Inviter un utilisateur" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Espace responsive paramètres")).toHaveClass("grid", "gap-6");
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
    expect(screen.getByLabelText("Espace responsive paramètres")).toHaveClass("grid", "gap-6");
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
    await fillInvitationForm();
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
    await fillInvitationForm();
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

describe("OrganizationSettingsPage - roles utilisateurs", () => {
  beforeEach(() => {
    resetOrganizationSettingsPageTest();
  });

  it("affiche les utilisateurs de l'organisation avec leurs roles", async () => {
    renderReadyPage();

    const userRolePanel = await screen.findByRole("region", { name: "Rôles de Armand Braud" });

    expect(screen.getByText("Gestion des rôles utilisateurs")).toBeInTheDocument();
    expect(within(userRolePanel).getByText("armand.braud@smartsite.fr")).toBeInTheDocument();
    expect(within(userRolePanel).getByRole("checkbox", { name: /Ouvrier/ })).toBeChecked();
    expect(within(userRolePanel).getByRole("checkbox", { name: /Droniste/ })).toBeDisabled();
  });

  it("filtre les utilisateurs par nom prenom et par role", async () => {
    renderReadyPage();

    await screen.findByRole("region", { name: "Rôles de Armand Braud" });

    fireEvent.change(screen.getByLabelText("Nom ou prénom"), {
      target: { value: "Andreea" },
    });

    expect(screen.getByRole("region", { name: "Rôles de Andreea Rauta" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Rôles de Armand Braud" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Nom ou prénom"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Filtrer par rôle"), {
      target: { value: "ouvrier" },
    });

    expect(screen.getByRole("region", { name: "Rôles de Armand Braud" })).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Rôles de Andreea Rauta" }),
    ).not.toBeInTheDocument();
  });

  it("met a jour les roles selectionnes sans recharger la page", async () => {
    const { getSubmittedUserRoles } = renderReadyPage();

    const userRolePanel = await screen.findByRole("region", { name: "Rôles de Armand Braud" });

    fireEvent.click(within(userRolePanel).getByRole("checkbox", { name: /Ouvrier/ }));
    expect(
      await within(userRolePanel).findByText("Sélectionnez au moins un rôle."),
    ).toBeInTheDocument();
    fireEvent.click(within(userRolePanel).getByRole("checkbox", { name: /Architecte/ }));
    fireEvent.click(
      within(userRolePanel).getByRole("button", {
        name: "Enregistrer les rôles de Armand Braud",
      }),
    );

    await waitFor(() => {
      expect(getSubmittedUserRoles()).toStrictEqual({
        organizationId: "organization-id",
        request: { roleCodes: ["architecte"] },
        userId: "organization-user-id",
      });
    });
    expect(await screen.findByText("Rôles mis à jour pour Armand Braud.")).toBeInTheDocument();
    expect(within(userRolePanel).getByRole("checkbox", { name: /Architecte/ })).toBeChecked();
  });

  it("affiche les erreurs API de mise a jour des roles", async () => {
    renderReadyPage({
      submitUserRolesResult: {
        message: "Cette combinaison de rôles n'est pas autorisée.",
        ok: false,
      },
    });

    const userRolePanel = await screen.findByRole("region", { name: "Rôles de Armand Braud" });

    fireEvent.click(within(userRolePanel).getByRole("checkbox", { name: /Ouvrier/ }));
    fireEvent.click(within(userRolePanel).getByRole("checkbox", { name: /Architecte/ }));
    fireEvent.click(
      within(userRolePanel).getByRole("button", {
        name: "Enregistrer les rôles de Armand Braud",
      }),
    );

    expect(
      await screen.findByText("Cette combinaison de rôles n'est pas autorisée."),
    ).toBeInTheDocument();
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

  it("redirige un utilisateur sans role admin vers le dashboard", async () => {
    saveAuthSession({
      ...registeredAccount,
      user: { ...registeredAccount.user, roles: ["ouvrier"] },
    });

    let loadCallCount = 0;
    const loadOrganizationDetails = () => {
      loadCallCount += 1;
      return Promise.resolve({ ok: true as const, organization });
    };

    renderOrganizationSettingsPageWithLoader(loadOrganizationDetails);

    await waitFor(() => {
      expectRouterRedirectTo("/dashboard");
    });
    expect(loadCallCount).toBe(0);
  });
});
