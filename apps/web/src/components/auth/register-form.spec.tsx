import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { RegisterRequestDto, RegisterResponseDto } from "@/generated/api";
import { RegisterForm, type RegisterSubmitter } from "./register-form";

const registeredAccount: RegisterResponseDto = {
  accessToken: "access-token",
  organization: {
    createdAt: "2026-06-01T10:00:00.000Z",
    email: "andreea@smartsite.fr",
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

describe("RegisterForm fields", () => {
  it("renders the registration fields", () => {
    renderRegisterForm(createSuccessfulSubmitter());

    expect(screen.getByLabelText("Prénom")).toBeInTheDocument();
    expect(screen.getByLabelText("Nom")).toBeInTheDocument();
    expect(screen.getByLabelText("Nom entreprise")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Mot de passe")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirmation mot de passe")).toBeInTheDocument();
  });

  it("blocks invalid required fields before calling the API", async () => {
    let submitCount = 0;
    const submitRegistration: RegisterSubmitter = () => {
      submitCount += 1;
      return Promise.resolve({ account: registeredAccount, ok: true });
    };

    renderRegisterForm(submitRegistration);
    fireEvent.click(screen.getByRole("button", { name: "Créer le compte" }));

    expect(await screen.findByText("Le prénom est obligatoire.")).toBeInTheDocument();
    expect(screen.getByText("Le nom d'entreprise est obligatoire.")).toBeInTheDocument();
    expect(submitCount).toBe(0);
  });

  it("blocks password confirmation mismatch", async () => {
    let submitCount = 0;
    const submitRegistration: RegisterSubmitter = () => {
      submitCount += 1;
      return Promise.resolve({ account: registeredAccount, ok: true });
    };

    renderRegisterForm(submitRegistration);
    fillValidForm({ passwordConfirmation: "SmartSite.2027" });
    fireEvent.click(screen.getByRole("button", { name: "Créer le compte" }));

    expect(await screen.findByText("Les mots de passe ne correspondent pas.")).toBeInTheDocument();
    expect(submitCount).toBe(0);
  });

  it("toggles password fields visibility", () => {
    renderRegisterForm(createSuccessfulSubmitter());

    const passwordInput = screen.getByLabelText("Mot de passe");
    const passwordConfirmationInput = screen.getByLabelText("Confirmation mot de passe");

    expect(passwordInput).toHaveAttribute("type", "password");
    expect(passwordConfirmationInput).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Afficher le mot de passe" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Afficher la confirmation du mot de passe" }),
    );

    expect(passwordInput).toHaveAttribute("type", "text");
    expect(passwordConfirmationInput).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: "Masquer le mot de passe" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Masquer la confirmation du mot de passe" }),
    );

    expect(passwordInput).toHaveAttribute("type", "password");
    expect(passwordConfirmationInput).toHaveAttribute("type", "password");
  });
});

describe("RegisterForm submission", () => {
  it("submits a normalized payload and completes registration", async () => {
    let submittedRequest: RegisterRequestDto | null = null;
    const submitRegistration: RegisterSubmitter = (request) => {
      submittedRequest = request;
      return Promise.resolve({ account: registeredAccount, ok: true });
    };
    const { getCompletedAccount } = renderRegisterForm(submitRegistration);

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Créer le compte" }));

    await waitFor(() => {
      expect(getCompletedAccount()).toStrictEqual(registeredAccount);
    });
    expect(submittedRequest).toStrictEqual({
      email: "andreea@smartsite.fr",
      firstName: "Andreea",
      lastName: "Rauta",
      organizationName: "Stern Tech",
      password: "SmartSite.2026",
    });
  });

  it("shows API errors without completing registration", async () => {
    const submitRegistration: RegisterSubmitter = () =>
      Promise.resolve({ message: "Un compte existe déjà avec cet email.", ok: false });
    const { getCompletedAccount } = renderRegisterForm(submitRegistration);

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Créer le compte" }));

    expect(await screen.findByText("Un compte existe déjà avec cet email.")).toBeInTheDocument();
    expect(getCompletedAccount()).toBeNull();
  });
});

function renderRegisterForm(submitRegistration: RegisterSubmitter): {
  readonly getCompletedAccount: () => RegisterResponseDto | null;
} {
  let completedAccount: RegisterResponseDto | null = null;

  render(
    <RegisterForm
      onRegistrationCompleted={(account) => {
        completedAccount = account;
      }}
      submitRegistration={submitRegistration}
    />,
  );

  return {
    getCompletedAccount: () => completedAccount,
  };
}

function createSuccessfulSubmitter(): RegisterSubmitter {
  return () => Promise.resolve({ account: registeredAccount, ok: true });
}

function fillValidForm(overrides: Partial<RegisterFormFixture> = {}): void {
  const fixture = { ...registerFormFixture, ...overrides };

  fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: fixture.firstName } });
  fireEvent.change(screen.getByLabelText("Nom"), { target: { value: fixture.lastName } });
  fireEvent.change(screen.getByLabelText("Nom entreprise"), {
    target: { value: fixture.organizationName },
  });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: fixture.email } });
  fireEvent.change(screen.getByLabelText("Mot de passe"), {
    target: { value: fixture.password },
  });
  fireEvent.change(screen.getByLabelText("Confirmation mot de passe"), {
    target: { value: fixture.passwordConfirmation },
  });
}

interface RegisterFormFixture {
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly organizationName: string;
  readonly password: string;
  readonly passwordConfirmation: string;
}

const registerFormFixture: RegisterFormFixture = {
  email: " ANDREEA@SMARTSITE.FR ",
  firstName: " Andreea ",
  lastName: " Rauta ",
  organizationName: " Stern Tech ",
  password: "SmartSite.2026",
  passwordConfirmation: "SmartSite.2026",
};
