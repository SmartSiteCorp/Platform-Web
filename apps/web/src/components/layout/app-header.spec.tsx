import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RegisterResponseDto } from "@/generated/api";
import { readAuthSession, saveAuthSession } from "@/lib/auth-session";
import { createTestAccessToken } from "@/test/create-test-access-token";
import { AppHeader } from "./app-header";

const routerMock = vi.hoisted(() => ({
  replace: vi.fn<(url: string) => void>(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

const authSession: RegisterResponseDto = {
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

describe("AppHeader", () => {
  beforeEach(() => {
    routerMock.replace.mockClear();
    window.localStorage.clear();
  });

  it("clears the auth session and redirects to login on logout", () => {
    saveAuthSession(authSession);

    render(<AppHeader activeItem="dashboard" />);
    fireEvent.click(screen.getByRole("button", { name: "Se déconnecter" }));

    expect(readAuthSession()).toBeNull();
    expect(routerMock.replace).toHaveBeenCalledWith("/login");
  });

  it("keeps the main navigation available", () => {
    render(<AppHeader activeItem="organization-settings" />);

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Paramètres" })).toHaveAttribute(
      "href",
      "/settings/organization",
    );
    expect(screen.getByRole("button", { name: "Se déconnecter" })).toBeInTheDocument();
  });
});
