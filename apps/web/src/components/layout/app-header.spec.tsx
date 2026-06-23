import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { readAuthSession, saveAuthSession } from "@/lib/auth-session";
import { createAuthSessionFixture } from "@/test/auth-session-fixture";
import { AppHeader } from "./app-header";

const routerMock = vi.hoisted(() => ({
  replace: vi.fn<(url: string) => void>(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

describe("AppHeader", () => {
  beforeEach(() => {
    routerMock.replace.mockClear();
    window.localStorage.clear();
  });

  it("clears the auth session and redirects to login on logout", () => {
    saveAuthSession(createAuthSessionFixture());

    render(<AppHeader activeItem="dashboard" />);
    fireEvent.click(screen.getByRole("button", { name: "Se déconnecter" }));

    expect(readAuthSession()).toBeNull();
    expect(routerMock.replace).toHaveBeenCalledWith("/login");
  });

  it("keeps the main navigation available for admins", () => {
    render(<AppHeader activeItem="organization-settings" showSettingsLink={true} />);

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Paramètres" })).toHaveAttribute(
      "href",
      "/settings/organization",
    );
    expect(screen.getByRole("button", { name: "Se déconnecter" })).toBeInTheDocument();
  });

  it("hides the settings link for non-admin users", () => {
    render(<AppHeader activeItem="dashboard" showSettingsLink={false} />);

    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Paramètres" })).not.toBeInTheDocument();
  });
});
