import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SiteManagerDashboardResponseDto } from "@/generated/api";
import { readAuthSession, saveAuthSession } from "@/lib/auth-session";
import type { LoadSiteManagerDashboardResult } from "@/lib/dashboard";
import { createAuthSessionFixture } from "@/test/auth-session-fixture";
import { DashboardShell, type SiteManagerDashboardLoader } from "./dashboard-shell";

const routerMock = vi.hoisted(() => ({
  replace: vi.fn<(url: string) => void>(),
}));

const searchParamsMock = vi.hoisted(() => new URLSearchParams());

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  useSearchParams: () => searchParamsMock,
}));

beforeEach(() => {
  routerMock.replace.mockClear();
  resetSearchParams();
  window.localStorage.clear();
});

describe("DashboardShell rendu initial", () => {
  it("affiche les donnees retournees par l'API dashboard", async () => {
    const { loader, session } = renderAuthenticatedDashboard();

    expect(await screen.findByRole("heading", { name: "Maison Berger" })).toBeInTheDocument();
    expect(screen.getByText("Progression globale")).toBeInTheDocument();
    expect(screen.getByText("Validation isolation mur nord")).toBeInTheDocument();
    expect(screen.getByText("Humidité détectée dans la pièce principale")).toBeInTheDocument();
    expect(loader).toHaveBeenCalledWith(session.accessToken, null);
  });

  it("redirige vers la connexion quand aucune session n'existe", async () => {
    const loader = createDashboardLoader({ dashboard: createDashboardFixture(), ok: true });

    render(<DashboardShell dashboardLoader={loader} />);

    await waitFor(() => {
      expect(routerMock.replace).toHaveBeenCalledWith("/login");
    });
    expect(loader).not.toHaveBeenCalled();
    expect(screen.queryByText("Tableau de bord SmartSite")).not.toBeInTheDocument();
  });

  it("supprime une session expiree avant d'afficher le dashboard", async () => {
    const loader = createDashboardLoader({ dashboard: createDashboardFixture(), ok: true });
    saveAuthSession(
      createAuthSessionFixture({
        expiresAtSeconds: Math.floor(Date.now() / 1000) - 1,
      }),
    );

    render(<DashboardShell dashboardLoader={loader} />);

    await waitFor(() => {
      expect(routerMock.replace).toHaveBeenCalledWith("/login");
    });
    expect(readAuthSession()).toBeNull();
    expect(loader).not.toHaveBeenCalled();
  });

  it("affiche le message de confirmation apres la creation d'un chantier", async () => {
    searchParamsMock.set("created", "1");

    renderAuthenticatedDashboard();

    expect(await screen.findByText("Chantier créé avec succès.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

describe("DashboardShell donnees API", () => {
  it("transmet le chantier cible a l'appel API", async () => {
    searchParamsMock.set("siteId", "site-id-1");

    const { loader, session } = renderAuthenticatedDashboard();

    await screen.findByRole("heading", { name: "Maison Berger" });
    expect(loader).toHaveBeenCalledWith(session.accessToken, "site-id-1");
  });

  it("affiche l'etat vide quand aucun chantier n'est accessible", async () => {
    const dashboard = createDashboardFixture({
      alerts: [],
      emptyState: {
        message: "Aucun chantier ne correspond encore a votre perimetre.",
        title: "Aucun chantier accessible",
      },
      navigationShortcuts: [],
      sites: [],
      upcomingDeadlines: [],
    });
    const loader = createDashboardLoader({ dashboard, ok: true });

    renderAuthenticatedDashboard(loader);

    expect(await screen.findByText("Aucun chantier accessible")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Créer un chantier/i })).toHaveAttribute(
      "href",
      "/sites/new",
    );
  });

  it("affiche une erreur claire et permet de reessayer", async () => {
    const loader = createDashboardLoader({
      message: "Impossible de joindre l'API SmartSite.",
      ok: false,
    });

    renderAuthenticatedDashboard(loader);

    expect(await screen.findByText("Dashboard indisponible")).toBeInTheDocument();
    expect(screen.getByText("Impossible de joindre l'API SmartSite.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));

    await waitFor(() => {
      expect(loader).toHaveBeenCalledTimes(2);
    });
  });

  it("relance le chargement avec le bouton d'actualisation", async () => {
    const loader = createDashboardLoader({ dashboard: createDashboardFixture(), ok: true });

    renderAuthenticatedDashboard(loader);

    await screen.findByRole("heading", { name: "Maison Berger" });
    fireEvent.click(screen.getByRole("button", { name: "Actualiser" }));

    await waitFor(() => {
      expect(loader).toHaveBeenCalledTimes(2);
    });
  });
});

describe("DashboardShell session active", () => {
  it("redirige quand l'API signale une session expiree", async () => {
    const loader = createDashboardLoader({
      message: "Votre session a expiré. Connectez-vous à nouveau.",
      ok: false,
      sessionExpired: true,
    });

    renderAuthenticatedDashboard(loader);

    await waitFor(() => {
      expect(routerMock.replace).toHaveBeenCalledWith("/login");
    });
    expect(readAuthSession()).toBeNull();
  });

  it("supprime la session apres deconnexion", async () => {
    renderAuthenticatedDashboard();

    expect(await screen.findByRole("heading", { name: "Maison Berger" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Se déconnecter" }));

    expect(readAuthSession()).toBeNull();
    expect(routerMock.replace).toHaveBeenCalledWith("/login");
  });
});

function renderAuthenticatedDashboard(
  loader = createDashboardLoader({ dashboard: createDashboardFixture(), ok: true }),
) {
  const session = createAuthSessionFixture();

  saveAuthSession(session);
  render(<DashboardShell dashboardLoader={loader} />);

  return { loader, session };
}

function createDashboardLoader(result: LoadSiteManagerDashboardResult) {
  return vi.fn<SiteManagerDashboardLoader>().mockResolvedValue(result);
}

const dashboardFixtureBase: SiteManagerDashboardResponseDto = {
  alerts: [
    {
      description: "Humidité détectée dans la pièce principale",
      detailsPath: "/sites/site-id-1/alerts/alert-id-1",
      detectedAt: "2026-07-02T08:00:00.000Z",
      id: "alert-id-1",
      recommendation: "Planifier un contrôle terrain.",
      severity: "critical",
      siteId: "site-id-1",
      siteName: "Maison Berger",
      status: "active",
      type: "ai_anomaly",
    },
  ],
  dataSources: [
    {
      key: "planning",
      label: "Planning",
      message: "Données planning disponibles.",
      status: "available",
    },
    {
      key: "drone",
      label: "Missions drone",
      message: "Module drone non connecté au dashboard.",
      status: "unavailable",
    },
  ],
  emptyState: null,
  generatedAt: "2026-07-03T10:00:00.000Z",
  navigationShortcuts: [
    {
      description: "Consulter la fiche chantier et les phases.",
      label: "Ouvrir Maison Berger",
      path: "/sites/site-id-1",
      siteId: "site-id-1",
      type: "site",
    },
  ],
  organizationId: "organization-id",
  realTimeAvailable: false,
  refreshIntervalSeconds: 60,
  refreshMode: "polling",
  siteId: null,
  sites: [
    {
      activeAlertsCount: 1,
      activeWorkersCount: 8,
      address: "12 rue des Pins, Lyon",
      criticalAlertsCount: 1,
      detailsPath: "/sites/site-id-1",
      id: "site-id-1",
      name: "Maison Berger",
      nextDeadlineAt: "2026-07-08",
      progressPercent: 68,
      status: "in_progress",
      taskCompletedCount: 21,
      taskInProgressCount: 7,
      taskTotalCount: 31,
    },
  ],
  stats: {
    accessibleSitesCount: 1,
    activeAlertsCount: 1,
    activeSitesCount: 1,
    activeWorkersCount: 8,
    criticalAlertsCount: 1,
    globalProgressPercent: 68,
    taskCompletedCount: 21,
    taskInProgressCount: 7,
    upcomingDeadlinesCount: 1,
  },
  upcomingDeadlines: [
    {
      detailsPath: "/sites/site-id-1/tasks/task-id-1",
      dueDate: "2026-07-08",
      id: "deadline-id-1",
      kind: "task",
      label: "Validation isolation mur nord",
      siteId: "site-id-1",
      siteName: "Maison Berger",
      status: "in_progress",
    },
  ],
};

function createDashboardFixture(
  overrides: Partial<SiteManagerDashboardResponseDto> = {},
): SiteManagerDashboardResponseDto {
  return { ...dashboardFixtureBase, ...overrides };
}

function resetSearchParams(): void {
  Array.from(searchParamsMock.keys()).forEach((key) => {
    searchParamsMock.delete(key);
  });
}
