import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LoginRequestDto, LoginResponseDto } from "@/generated/api";
import { getAuthSessionStorageKey } from "@/lib/auth-session";
import type { LoginAccountResult } from "@/lib/login-account";
import { LoginPage } from "./login-page";

const routerMock = vi.hoisted(() => ({
  push: vi.fn<(url: string) => void>(),
}));

const loginMock = vi.hoisted(() => ({
  loginAccount: vi.fn<(request: LoginRequestDto) => Promise<LoginAccountResult>>(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerMock.push,
  }),
}));

vi.mock("@/lib/login-account", () => ({
  loginAccount: loginMock.loginAccount,
}));

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

describe("LoginPage", () => {
  beforeEach(() => {
    routerMock.push.mockClear();
    loginMock.loginAccount.mockReset();
    window.localStorage.clear();
  });

  it("stores the auth session and redirects to the dashboard after login", async () => {
    loginMock.loginAccount.mockResolvedValue({
      account: loggedAccount,
      ok: true,
    });

    render(<LoginPage />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(routerMock.push).toHaveBeenCalledWith("/dashboard");
    });
    expect(window.localStorage.getItem(getAuthSessionStorageKey())).toBe(
      JSON.stringify(loggedAccount),
    );
    expect(loginMock.loginAccount).toHaveBeenCalledWith({
      email: "andreea@smartsite.fr",
      password: "SmartSite.2026",
    });
  });

  it("keeps mobile and desktop responsive sections available", () => {
    loginMock.loginAccount.mockResolvedValue({
      account: loggedAccount,
      ok: true,
    });

    render(<LoginPage />);

    expect(screen.getByLabelText("Formulaire connexion")).toHaveClass("lg:w-1/2");
    expect(screen.getByText("Plateforme Web")).toBeInTheDocument();
    expect(screen.getByText("Connexion sécurisée")).toBeInTheDocument();
  });
});

function fillValidForm(): void {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: " ANDREEA@SMARTSITE.FR " },
  });
  fireEvent.change(screen.getByLabelText("Mot de passe"), {
    target: { value: "SmartSite.2026" },
  });
}
