import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { LoginRequestDto, LoginResponseDto } from "@/generated/api";
import { LoginForm, type LoginSubmitter } from "./login-form";

const loggedAccount: LoginResponseDto = {
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

describe("LoginForm fields", () => {
  it("renders the login fields", () => {
    renderLoginForm(createSuccessfulSubmitter());

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Mot de passe")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Créer une organisation" })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  it("blocks empty fields before calling the API", async () => {
    let submitCount = 0;
    const submitLogin: LoginSubmitter = () => {
      submitCount += 1;
      return Promise.resolve({ account: loggedAccount, ok: true });
    };

    renderLoginForm(submitLogin);
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByText("L'email doit être valide.")).toBeInTheDocument();
    expect(screen.getByText("Le mot de passe est obligatoire.")).toBeInTheDocument();
    expect(submitCount).toBe(0);
  });

  it("blocks invalid email before calling the API", async () => {
    let submitCount = 0;
    const submitLogin: LoginSubmitter = () => {
      submitCount += 1;
      return Promise.resolve({ account: loggedAccount, ok: true });
    };

    renderLoginForm(submitLogin);
    fillValidForm({ email: "email-invalide" });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByText("L'email doit être valide.")).toBeInTheDocument();
    expect(submitCount).toBe(0);
  });

  it("toggles password visibility", () => {
    renderLoginForm(createSuccessfulSubmitter());

    const passwordInput = screen.getByLabelText("Mot de passe");

    expect(passwordInput).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Afficher le mot de passe" }));

    expect(passwordInput).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: "Masquer le mot de passe" }));

    expect(passwordInput).toHaveAttribute("type", "password");
  });
});

describe("LoginForm submission", () => {
  it("submits a normalized payload and completes login", async () => {
    let submittedRequest: LoginRequestDto | null = null;
    const submitLogin: LoginSubmitter = (request) => {
      submittedRequest = request;
      return Promise.resolve({ account: loggedAccount, ok: true });
    };
    const { getCompletedAccount } = renderLoginForm(submitLogin);

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(getCompletedAccount()).toStrictEqual(loggedAccount);
    });
    expect(submittedRequest).toStrictEqual({
      email: "andreea@smartsite.fr",
      password: "SmartSite.2026",
    });
  });

  it("shows API errors without completing login", async () => {
    const submitLogin: LoginSubmitter = () =>
      Promise.resolve({ message: "Email ou mot de passe incorrect.", ok: false });
    const { getCompletedAccount } = renderLoginForm(submitLogin);

    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByText("Email ou mot de passe incorrect.")).toBeInTheDocument();
    expect(getCompletedAccount()).toBeNull();
  });
});

function renderLoginForm(submitLogin: LoginSubmitter): {
  readonly getCompletedAccount: () => LoginResponseDto | null;
} {
  let completedAccount: LoginResponseDto | null = null;

  render(
    <LoginForm
      onLoginCompleted={(account) => {
        completedAccount = account;
      }}
      submitLogin={submitLogin}
    />,
  );

  return {
    getCompletedAccount: () => completedAccount,
  };
}

function createSuccessfulSubmitter(): LoginSubmitter {
  return () => Promise.resolve({ account: loggedAccount, ok: true });
}

function fillValidForm(overrides: Partial<LoginFormFixture> = {}): void {
  const fixture = { ...loginFormFixture, ...overrides };

  fireEvent.change(screen.getByLabelText("Email"), { target: { value: fixture.email } });
  fireEvent.change(screen.getByLabelText("Mot de passe"), {
    target: { value: fixture.password },
  });
}

interface LoginFormFixture {
  readonly email: string;
  readonly password: string;
}

const loginFormFixture: LoginFormFixture = {
  email: " ANDREEA@SMARTSITE.FR ",
  password: "SmartSite.2026",
};
