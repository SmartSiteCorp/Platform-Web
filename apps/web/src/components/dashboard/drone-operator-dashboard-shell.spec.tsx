import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { readAuthSession, saveAuthSession } from "@/lib/auth-session";
import type { LoadDroneOperatorDashboardResult } from "@/lib/dashboard";
import { createAuthSessionFixture } from "@/test/auth-session-fixture";
import {
  DroneOperatorDashboardShell,
  type DroneOperatorDashboardLoader,
} from "./drone-operator-dashboard-shell";
import { createDroneOperatorDashboardFixture } from "./drone-operator-dashboard-test-fixtures";

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

describe("DroneOperatorDashboardShell rendu nominal", () => {
  it("affiche les indicateurs CDC et les liens vers les missions", async () => {
    const { loader, session } = renderAuthenticatedDashboard();

    expect(
      await screen.findByRole("heading", { name: "Inspection toiture nord" }),
    ).toBeInTheDocument();
    expectStatValue("Missions planifiées", "2");
    expectStatValue("Missions en cours", "1");
    expectStatValue("Drones connectés", "2");
    expectStatValue("Batterie moyenne", "74%");
    expectStatValue("Alertes techniques", "1");
    expect(screen.getAllByText("Anafi-01").length).toBeGreaterThan(0);
    expect(screen.getByText("Batterie faible sur Mavic-02")).toBeInTheDocument();
    expectLinkHref(/Inspection toiture nord/i, "/drone/missions/mission-id-1");
    expect(loader).toHaveBeenCalledWith(session.accessToken, null);
  });

  it("transmet le chantier cible a l'appel API", async () => {
    searchParamsMock.set("siteId", "site-id-1");

    const { loader, session } = renderAuthenticatedDashboard();

    await screen.findByRole("heading", { name: "Inspection toiture nord" });
    expect(loader).toHaveBeenCalledWith(session.accessToken, "site-id-1");
  });

  it("affiche l'etat vide quand aucune mission n'est accessible", async () => {
    const baseDashboard = createDroneOperatorDashboardFixture();
    const dashboard = createDroneOperatorDashboardFixture({
      drones: [],
      emptyState: {
        message: "Aucune mission drone ne correspond encore à votre périmètre.",
        title: "Aucune mission drone accessible",
      },
      missions: [],
      navigationShortcuts: [],
      stats: {
        ...baseDashboard.stats,
        activeMissionsCount: 0,
        assignedMissionsCount: 0,
        averageBatteryPercent: null,
        connectedDronesCount: 0,
        plannedMissionsCount: 0,
        technicalAlertsCount: 0,
      },
      technicalAlerts: [],
    });
    const loader = createDashboardLoader({ dashboard, ok: true });

    renderAuthenticatedDashboard(loader);

    expect(await screen.findByText("Aucune mission drone accessible")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Voir le dashboard général/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });
});

describe("DroneOperatorDashboardShell erreurs et rafraichissement", () => {
  it("affiche une erreur claire et permet de reessayer", async () => {
    const loader = createDashboardLoader({
      message: "Impossible de joindre l'API SmartSite.",
      ok: false,
    });

    renderAuthenticatedDashboard(loader);

    expect(await screen.findByText("Dashboard droniste indisponible")).toBeInTheDocument();
    expect(screen.getByText("Impossible de joindre l'API SmartSite.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));

    await waitFor(() => {
      expect(loader).toHaveBeenCalledTimes(2);
    });
  });

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

  it("programme le rafraichissement selon l'intervalle retourne par l'API", async () => {
    const setIntervalSpy = vi.spyOn(window, "setInterval");

    try {
      renderAuthenticatedDashboard();

      expect(
        await screen.findByRole("heading", { name: "Inspection toiture nord" }),
      ).toBeInTheDocument();

      await waitFor(() => {
        expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000);
      });
    } finally {
      setIntervalSpy.mockRestore();
    }
  });
});

function renderAuthenticatedDashboard(
  loader = createDashboardLoader({
    dashboard: createDroneOperatorDashboardFixture(),
    ok: true,
  }),
) {
  const session = createAuthSessionFixture();

  saveAuthSession(session);
  render(<DroneOperatorDashboardShell dashboardLoader={loader} />);

  return { loader, session };
}

function createDashboardLoader(result: LoadDroneOperatorDashboardResult) {
  return vi.fn<DroneOperatorDashboardLoader>().mockResolvedValue(result);
}

function expectLinkHref(label: RegExp, href: string): void {
  const hasMatchingLink = screen
    .getAllByRole("link", { name: label })
    .some((linkElement) => linkElement.getAttribute("href") === href);

  expect(hasMatchingLink).toBe(true);
}

function expectStatValue(label: string, value: string): void {
  const hasMatchingStat = screen.getAllByText(label).some((labelElement) => {
    const statContainer = labelElement.parentElement;

    return statContainer ? within(statContainer).queryByText(value) !== null : false;
  });

  expect(hasMatchingStat).toBe(true);
}

function resetSearchParams(): void {
  Array.from(searchParamsMock.keys()).forEach((key) => {
    searchParamsMock.delete(key);
  });
}
