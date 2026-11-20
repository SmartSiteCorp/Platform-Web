import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type {
  CreateOrganizationInvitationRequestDto,
  OrganizationInvitationResponseDto,
} from "@/generated/api";
import {
  OrganizationInvitationForm,
  type OrganizationInvitationSubmitter,
} from "./organization-invitation-form";

const createdInvitation: OrganizationInvitationResponseDto = {
  createdAt: "2026-06-01T10:00:00.000Z",
  email: "ouvrier@smartsite.fr",
  expiresAt: "2026-06-08T10:00:00.000Z",
  id: "invitation-id",
  organizationId: "organization-id",
  roleCodes: ["ouvrier"],
  token: "invitation-token",
};

describe("OrganizationInvitationForm - affichage et validation", () => {
  it("affiche le champ email et la selection des roles", () => {
    renderInvitationForm(createSuccessfulInvitationSubmitter());

    expect(screen.getByRole("form", { name: "Formulaire invitation utilisateur" })).toHaveClass(
      "space-y-5",
    );
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Chef de chantier/ })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Ouvrier/ })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Architecte/ })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Droniste/ })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Sélection des rôles invitation" })).toHaveClass(
      "md:grid-cols-2",
    );
  });

  it("bloque les donnees invalides avant l'appel API", async () => {
    let submitCount = 0;
    const submitOrganizationInvitation: OrganizationInvitationSubmitter = () => {
      submitCount += 1;
      return Promise.resolve({ invitation: createdInvitation, ok: true });
    };

    renderInvitationForm(submitOrganizationInvitation);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "email-invalide" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer l'invitation" }));

    expect(await screen.findByText("L'email doit être valide.")).toBeInTheDocument();
    expect(screen.getByText("Sélectionnez au moins un rôle.")).toBeInTheDocument();
    expect(submitCount).toBe(0);
  });

  it("desactive les roles incompatibles avec la selection courante", async () => {
    renderInvitationForm(createSuccessfulInvitationSubmitter());

    const workerRole = screen.getByRole("checkbox", { name: /Ouvrier/ });
    const foremanRole = screen.getByRole("checkbox", { name: /Chef de chantier/ });
    const architectRole = screen.getByRole("checkbox", { name: /Architecte/ });
    const droneOperatorRole = screen.getByRole("checkbox", { name: /Droniste/ });

    fireEvent.click(workerRole);

    await waitFor(() => {
      expect(foremanRole).toBeDisabled();
      expect(architectRole).toBeDisabled();
      expect(droneOperatorRole).toBeDisabled();
    });

    fireEvent.click(workerRole);

    await waitFor(() => {
      expect(foremanRole).toBeEnabled();
    });

    fireEvent.click(foremanRole);

    await waitFor(() => {
      expect(workerRole).toBeDisabled();
      expect(architectRole).toBeDisabled();
      expect(droneOperatorRole).toBeEnabled();
    });
  });
});

describe("OrganizationInvitationForm - envoi API", () => {
  it("envoie une invitation normalisee et affiche le lien genere", async () => {
    let submittedInvitation: CreateOrganizationInvitationRequestDto | null = null;
    const submitOrganizationInvitation: OrganizationInvitationSubmitter = (
      _organizationId,
      request,
    ) => {
      submittedInvitation = request;
      return Promise.resolve({ invitation: createdInvitation, ok: true });
    };

    renderInvitationForm(submitOrganizationInvitation);
    fillValidInvitationForm();
    fireEvent.click(screen.getByRole("button", { name: "Envoyer l'invitation" }));

    await waitFor(() => {
      expect(submittedInvitation).toStrictEqual({
        email: "ouvrier@smartsite.fr",
        roleCodes: ["ouvrier"],
      });
    });
    expect(
      await screen.findByText("Invitation prête pour ouvrier@smartsite.fr."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Lien d'invitation")).toHaveValue(
      new URL("/invitations/accept?token=invitation-token", window.location.origin).toString(),
    );
  });

  it("affiche les erreurs retournees par l'API", async () => {
    const submitOrganizationInvitation: OrganizationInvitationSubmitter = () =>
      Promise.resolve({
        message: "Cette adresse email est déjà invitée.",
        ok: false,
      });

    renderInvitationForm(submitOrganizationInvitation);
    fillValidInvitationForm();
    fireEvent.click(screen.getByRole("button", { name: "Envoyer l'invitation" }));

    expect(await screen.findByText("Cette adresse email est déjà invitée.")).toBeInTheDocument();
  });
});

function renderInvitationForm(submitOrganizationInvitation: OrganizationInvitationSubmitter): void {
  render(
    <OrganizationInvitationForm
      organizationId="organization-id"
      submitOrganizationInvitation={submitOrganizationInvitation}
    />,
  );
}

function createSuccessfulInvitationSubmitter(): OrganizationInvitationSubmitter {
  return () => Promise.resolve({ invitation: createdInvitation, ok: true });
}

function fillValidInvitationForm(): void {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: " OUVRIER@SMARTSITE.FR " },
  });
  fireEvent.click(screen.getByRole("checkbox", { name: /Ouvrier/ }));
}
