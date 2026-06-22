import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type {
  AcceptOrganizationInvitationRequestDto,
  AcceptOrganizationInvitationResponseDto,
} from "@/generated/api";
import {
  OrganizationInvitationAcceptanceForm,
  type OrganizationInvitationAcceptanceSubmitter,
} from "./organization-invitation-acceptance-form";

const acceptedAccount: AcceptOrganizationInvitationResponseDto = {
  accessToken: "access-token",
  organization: {
    createdAt: "2026-06-01T10:00:00.000Z",
    email: "contact@smartsite.fr",
    id: "organization-id",
    name: "Stern Tech",
  },
  tokenType: "Bearer",
  user: {
    createdAt: "2026-06-01T10:00:00.000Z",
    email: "ouvrier@smartsite.fr",
    firstName: "Alex",
    id: "user-id",
    lastName: "Martin",
    organizationId: "organization-id",
    phone: null,
    roles: ["ouvrier"],
    status: "active",
  },
};

describe("OrganizationInvitationAcceptanceForm", () => {
  it("affiche les champs de creation de compte", () => {
    renderAcceptanceForm(createSuccessfulAcceptanceSubmitter());

    expect(screen.getByRole("form", { name: "Formulaire création compte invitation" })).toHaveClass(
      "space-y-4",
    );
    expect(screen.getByLabelText("Prénom")).toBeInTheDocument();
    expect(screen.getByLabelText("Nom")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Téléphone")).toBeInTheDocument();
    expect(screen.getByLabelText("Mot de passe")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Confirmation mot de passe")).toHaveAttribute("type", "password");
    expect(screen.getByRole("link", { name: "Se connecter" })).toHaveAttribute("href", "/login");
  });

  it("bloque les donnees invalides avant l'appel API", async () => {
    let submitCount = 0;
    const submitInvitationAcceptance: OrganizationInvitationAcceptanceSubmitter = () => {
      submitCount += 1;
      return Promise.resolve({ account: acceptedAccount, ok: true });
    };

    renderAcceptanceForm(submitInvitationAcceptance);
    fillAcceptanceForm({
      email: "email-invalide",
      passwordConfirmation: "Motdepasse.2026",
    });
    fireEvent.click(screen.getByRole("button", { name: "Créer mon compte" }));

    expect(await screen.findByText("L'email doit être valide.")).toBeInTheDocument();
    expect(screen.getByText("Les mots de passe ne correspondent pas.")).toBeInTheDocument();
    expect(submitCount).toBe(0);
  });

  it("envoie une acceptation normalisee", async () => {
    let submittedRequest: AcceptOrganizationInvitationRequestDto | null = null;
    let acceptedResult: AcceptOrganizationInvitationResponseDto | null = null;
    const submitInvitationAcceptance: OrganizationInvitationAcceptanceSubmitter = (request) => {
      submittedRequest = request;
      return Promise.resolve({ account: acceptedAccount, ok: true });
    };

    renderAcceptanceForm(submitInvitationAcceptance, (account) => {
      acceptedResult = account;
    });
    fillAcceptanceForm({ phone: " " });
    fireEvent.click(screen.getByRole("button", { name: "Créer mon compte" }));

    await waitFor(() => {
      expect(submittedRequest).toStrictEqual({
        email: "ouvrier@smartsite.fr",
        firstName: "Alex",
        lastName: "Martin",
        password: "SmartSite.2026",
        token: "invitation-token",
      });
    });
    expect(acceptedResult).toBe(acceptedAccount);
  });

  it("affiche les erreurs retournees par l'API", async () => {
    const submitInvitationAcceptance: OrganizationInvitationAcceptanceSubmitter = () =>
      Promise.resolve({
        message: "L'invitation a expiré.",
        ok: false,
      });

    renderAcceptanceForm(submitInvitationAcceptance);
    fillAcceptanceForm();
    fireEvent.click(screen.getByRole("button", { name: "Créer mon compte" }));

    expect(await screen.findByText("L'invitation a expiré.")).toBeInTheDocument();
  });

  it("permet d'afficher et masquer les mots de passe", () => {
    renderAcceptanceForm(createSuccessfulAcceptanceSubmitter());

    fireEvent.click(screen.getByRole("button", { name: "Afficher le mot de passe" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Afficher la confirmation du mot de passe" }),
    );

    expect(screen.getByLabelText("Mot de passe")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Confirmation mot de passe")).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: "Masquer le mot de passe" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Masquer la confirmation du mot de passe" }),
    );

    expect(screen.getByLabelText("Mot de passe")).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Confirmation mot de passe")).toHaveAttribute("type", "password");
  });
});

function renderAcceptanceForm(
  submitInvitationAcceptance: OrganizationInvitationAcceptanceSubmitter,
  onInvitationAccepted: (account: AcceptOrganizationInvitationResponseDto) => void = () => {},
): void {
  render(
    <OrganizationInvitationAcceptanceForm
      onInvitationAccepted={onInvitationAccepted}
      submitInvitationAcceptance={submitInvitationAcceptance}
      token="invitation-token"
    />,
  );
}

function createSuccessfulAcceptanceSubmitter(): OrganizationInvitationAcceptanceSubmitter {
  return () => Promise.resolve({ account: acceptedAccount, ok: true });
}

function fillAcceptanceForm({
  email = " OUVRIER@SMARTSITE.FR ",
  passwordConfirmation = "SmartSite.2026",
  phone = " +33123456789 ",
}: {
  readonly email?: string;
  readonly passwordConfirmation?: string;
  readonly phone?: string;
} = {}): void {
  fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: " Alex " } });
  fireEvent.change(screen.getByLabelText("Nom"), { target: { value: " Martin " } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Téléphone"), { target: { value: phone } });
  fireEvent.change(screen.getByLabelText("Mot de passe"), {
    target: { value: "SmartSite.2026" },
  });
  fireEvent.change(screen.getByLabelText("Confirmation mot de passe"), {
    target: { value: passwordConfirmation },
  });
}
