import { render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SiteManagerDashboardResponseDto } from "@/generated/api";
import { saveAuthSession } from "@/lib/auth-session";
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

describe("DashboardShell recette chef de chantier", () => {
  it("affiche les indicateurs CDC et les liens vers les details chantier", async () => {
    const { loader, session } = renderAuthenticatedDashboard();

    expect(await screen.findByRole("heading", { name: "Maison Berger" })).toBeInTheDocument();
    expectStatValue("Progression globale", "68%");
    expectStatValue("Tâches en cours", "7");
    expectStatValue("Tâches terminées", "21");
    expectStatValue("Ouvriers actifs", "8");
    expectStatValue("Alertes actives", "1");
    expect(screen.getByText("Validation isolation mur nord")).toBeInTheDocument();
    expect(screen.getByText("Humidité détectée dans la pièce principale")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Validation isolation mur nord/i })).toHaveAttribute(
      "href",
      "/sites/site-id-1/tasks/task-id-1",
    );
    expect(screen.getByRole("link", { name: /Ouvrir Maison Berger/i })).toHaveAttribute(
      "href",
      "/sites/site-id-1",
    );
    expect(loader).toHaveBeenCalledWith(session.accessToken, null);
  });

  it("programme le rafraichissement selon l'intervalle retourne par l'API", async () => {
    const setIntervalSpy = vi.spyOn(window, "setInterval");

    try {
      renderAuthenticatedDashboard();

      expect(await screen.findByRole("heading", { name: "Maison Berger" })).toBeInTheDocument();

      await waitFor(() => {
        expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000);
      });
    } finally {
      setIntervalSpy.mockRestore();
    }
  });
});

function renderAuthenticatedDashboard(
  loader = createDashboardLoader({ dashboard: dashboardAcceptanceFixture, ok: true }),
) {
  const session = createAuthSessionFixture();

  saveAuthSession(session);
  render(<DashboardShell dashboardLoader={loader} />);

  return { loader, session };
}

function createDashboardLoader(result: LoadSiteManagerDashboardResult) {
  return vi.fn<SiteManagerDashboardLoader>().mockResolvedValue(result);
}

function expectStatValue(label: string, value: string): void {
  const labelElement = screen.getByText(label);
  const statContainer = labelElement.parentElement;

  if (!statContainer) {
    throw new Error(`Statistique "${label}" introuvable.`);
  }

  expect(within(statContainer).getByText(value)).toBeInTheDocument();
}

function resetSearchParams(): void {
  Array.from(searchParamsMock.keys()).forEach((key) => {
    searchParamsMock.delete(key);
  });
}

const dashboardAcceptanceFixture: SiteManagerDashboardResponseDto = {
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
      label: "Planning chantier",
      message: "Données calculées depuis les phases, tâches et échéances.",
      status: "available",
    },
    {
      key: "real_time_events",
      label: "Mise à jour temps réel",
      message: "Flux temps réel non connecté, réponse prête pour rafraîchissement HTTP.",
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
      type: "site_details",
    },
  ],
  organizationId: "organization-id",
  realTimeAvailable: false,
  refreshIntervalSeconds: 30,
  refreshMode: "http_polling",
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
