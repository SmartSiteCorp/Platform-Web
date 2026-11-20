import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RegisterRequestDto, RegisterResponseDto } from "@/generated/api";
import { getAuthSessionStorageKey } from "@/lib/auth-session";
import type { RegisterAccountResult } from "@/lib/register-account";
import { RegisterPage } from "./register-page";

const routerMock = vi.hoisted(() => ({
  push: vi.fn<(url: string) => void>(),
}));

const registrationMock = vi.hoisted(() => ({
  registerAccount: vi.fn<(request: RegisterRequestDto) => Promise<RegisterAccountResult>>(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerMock.push,
  }),
}));

vi.mock("@/lib/register-account", () => ({
  registerAccount: registrationMock.registerAccount,
}));

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

describe("RegisterPage", () => {
  beforeEach(() => {
    routerMock.push.mockClear();
    registrationMock.registerAccount.mockReset();
    window.localStorage.clear();
  });

  it("stores the auth session and redirects to the dashboard after registration", async () => {
    registrationMock.registerAccount.mockResolvedValue({
      account: registeredAccount,
      ok: true,
    });

    render(<RegisterPage />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Créer le compte" }));

    await waitFor(() => {
      expect(routerMock.push).toHaveBeenCalledWith("/dashboard");
    });
    expect(window.localStorage.getItem(getAuthSessionStorageKey())).toBe(
      JSON.stringify(registeredAccount),
    );
    expect(registrationMock.registerAccount).toHaveBeenCalledWith({
      email: "andreea@smartsite.fr",
      firstName: "Andreea",
      lastName: "Rauta",
      organizationName: "Stern Tech",
      password: "SmartSite.2026",
    });
  });

  it("keeps mobile and desktop responsive sections available", () => {
    registrationMock.registerAccount.mockResolvedValue({
      account: registeredAccount,
      ok: true,
    });

    render(<RegisterPage />);

    expect(screen.getByLabelText("Formulaire inscription")).toHaveClass("lg:w-1/2");
    expect(screen.getByText("Plateforme Web")).toBeInTheDocument();
    expect(screen.getByText("Organisation")).toBeInTheDocument();
  });
});

function fillValidForm(): void {
  fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: " Andreea " } });
  fireEvent.change(screen.getByLabelText("Nom"), { target: { value: " Rauta " } });
  fireEvent.change(screen.getByLabelText("Nom entreprise"), {
    target: { value: " Stern Tech " },
  });
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: " ANDREEA@SMARTSITE.FR " },
  });
  fireEvent.change(screen.getByLabelText("Mot de passe"), {
    target: { value: "SmartSite.2026" },
  });
  fireEvent.change(screen.getByLabelText("Confirmation mot de passe"), {
    target: { value: "SmartSite.2026" },
  });
}
