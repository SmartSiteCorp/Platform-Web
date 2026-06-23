import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { readAuthSession, saveAuthSession } from "@/lib/auth-session";
import { createAuthSessionFixture } from "@/test/auth-session-fixture";
import { DashboardShell } from "./dashboard-shell";

const routerMock = vi.hoisted(() => ({
  replace: vi.fn<(url: string) => void>(),
}));

const searchParamsMock = vi.hoisted(() => new URLSearchParams());

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  useSearchParams: () => searchParamsMock,
}));

describe("DashboardShell route protection and logout recette", () => {
  beforeEach(() => {
    routerMock.replace.mockClear();
    searchParamsMock.delete("created");
    window.localStorage.clear();
  });

  it("affiche le dashboard quand la session est valide", async () => {
    saveAuthSession(createAuthSessionFixture());

    render(<DashboardShell />);

    expect(await screen.findByText("Tableau de bord SmartSite")).toBeInTheDocument();
    expect(routerMock.replace).not.toHaveBeenCalled();
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

  it("affiche le message de confirmation apres la creation d'un chantier", async () => {
    saveAuthSession(createAuthSessionFixture());
    searchParamsMock.set("created", "1");

    render(<DashboardShell />);

    expect(await screen.findByText("Chantier créé avec succès.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("n'affiche pas le message de confirmation sans le parametre created", async () => {
    saveAuthSession(createAuthSessionFixture());

    render(<DashboardShell />);

    expect(await screen.findByText("Tableau de bord SmartSite")).toBeInTheDocument();
    expect(screen.queryByText("Chantier créé avec succès.")).not.toBeInTheDocument();
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
