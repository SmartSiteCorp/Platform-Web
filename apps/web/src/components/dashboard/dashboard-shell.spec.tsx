import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { readAuthSession, saveAuthSession } from "@/lib/auth-session";
import { createAuthSessionFixture } from "@/test/auth-session-fixture";
import { DashboardShell } from "./dashboard-shell";

const routerMock = vi.hoisted(() => ({
  replace: vi.fn<(url: string) => void>(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

describe("DashboardShell route protection and logout recette", () => {
  beforeEach(() => {
    routerMock.replace.mockClear();
    window.localStorage.clear();
  });

  it("redirige vers la connexion quand aucune session n'existe", async () => {
    render(<DashboardShell />);

    await waitFor(() => {
      expect(routerMock.replace).toHaveBeenCalledWith("/login");
    });
    expect(screen.queryByText("Tableau de bord SmartSite")).not.toBeInTheDocument();
  });

  it("supprime une session expiree avant d'afficher le dashboard", async () => {
    saveAuthSession(
      createAuthSessionFixture({
        expiresAtSeconds: Math.floor(Date.now() / 1000) - 1,
      }),
    );

    render(<DashboardShell />);

    await waitFor(() => {
      expect(routerMock.replace).toHaveBeenCalledWith("/login");
    });
    expect(readAuthSession()).toBeNull();
    expect(screen.queryByText("Tableau de bord SmartSite")).not.toBeInTheDocument();
  });

  it("removes the session and blocks a new dashboard access after logout", async () => {
    saveAuthSession(createAuthSessionFixture());

    const { unmount } = render(<DashboardShell />);

    expect(await screen.findByText("Tableau de bord SmartSite")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Se déconnecter" }));

    expect(readAuthSession()).toBeNull();
    expect(routerMock.replace).toHaveBeenCalledWith("/login");

    unmount();
    routerMock.replace.mockClear();

    render(<DashboardShell />);

    await waitFor(() => {
      expect(routerMock.replace).toHaveBeenCalledWith("/login");
    });
    expect(screen.queryByText("Tableau de bord SmartSite")).not.toBeInTheDocument();
  });
});
