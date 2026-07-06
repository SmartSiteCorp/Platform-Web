import { render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DroneOperatorDashboardResponseDto } from "@/generated/api";
import { saveAuthSession } from "@/lib/auth-session";
import type { LoadDroneOperatorDashboardResult } from "@/lib/dashboard";
import { createAuthSessionFixture } from "@/test/auth-session-fixture";
import {
  DroneOperatorDashboardShell,
  type DroneOperatorDashboardLoader,
} from "./drone-operator-dashboard-shell";

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

describe("DroneOperatorDashboardShell recette droniste", () => {
  it("affiche les indicateurs CDC et les liens vers les missions drone", async () => {
    const { loader, session } = renderAuthenticatedDashboard();

    expect(
      await screen.findByRole("heading", { name: "Vol inspection toiture" }),
    ).toBeInTheDocument();
    expectStatValue("Missions planifiées", "1");
    expectStatValue("Missions en cours", "1");
    expectStatValue("Drones connectés", "1");
    expectStatValue("Batterie moyenne", "45%");
    expectStatValue("Alertes techniques", "1");
    expect(screen.getAllByText("Drone Connecté Recette").length).toBeGreaterThan(0);
    expect(screen.getByText("Batterie drone faible (18%).")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Vol inspection toiture/i })).toHaveAttribute(
      "href",
      "/drone/missions/mission-active-id",
    );
    expect(
      screen.getByRole("link", { name: /Ouvrir mission Base Drone Recette/i }),
    ).toHaveAttribute("href", "/drone/missions/mission-active-id");
    expect(loader).toHaveBeenCalledWith(session.accessToken, null);
  });

  it("programme le rafraichissement selon l'intervalle retourne par l'API", async () => {
    const setIntervalSpy = vi.spyOn(window, "setInterval");

    try {
      renderAuthenticatedDashboard();

      expect(
        await screen.findByRole("heading", { name: "Vol inspection toiture" }),
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
  loader = createDashboardLoader({ dashboard: droneDashboardAcceptanceFixture, ok: true }),
) {
  const session = createAuthSessionFixture();

  saveAuthSession(session);
  render(<DroneOperatorDashboardShell dashboardLoader={loader} />);

  return { loader, session };
}

function createDashboardLoader(result: LoadDroneOperatorDashboardResult) {
  return vi.fn<DroneOperatorDashboardLoader>().mockResolvedValue(result);
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

const droneDashboardAcceptanceFixture: DroneOperatorDashboardResponseDto = {
  dataSources: [
    {
      key: "drone_missions",
      label: "Missions drone",
      message: "Missions calculées depuis les données drone persistées.",
      status: "available",
    },
    {
      key: "real_time_telemetry",
      label: "Télémétrie temps réel",
      message: "Flux temps réel non connecté, réponse prête pour rafraîchissement HTTP.",
      status: "unavailable",
    },
  ],
  drones: [
    {
      batteryPercent: 18,
      connectionStatus: "connected",
      currentMissionId: "mission-active-id",
      currentMissionStatus: "in_progress",
      detailsPath: "/drone/devices/drone-connected-id",
      id: "drone-connected-id",
      name: "Drone Connecté Recette",
    },
  ],
  emptyState: null,
  generatedAt: "2026-07-06T10:00:00.000Z",
  missions: [
    {
      batteryPercent: 18,
      connectionStatus: "connected",
      detailsPath: "/drone/missions/mission-active-id",
      droneId: "drone-connected-id",
      droneName: "Drone Connecté Recette",
      estimatedDurationMinutes: 45,
      flightId: "flight-active-id",
      flightName: "Vol inspection toiture",
      flightStatus: "in_progress",
      id: "mission-active-id",
      missionDate: "2026-07-06T08:00:00.000Z",
      siteId: "site-recette-id",
      siteName: "Base Drone Recette",
      status: "in_progress",
    },
    {
      batteryPercent: 72,
      connectionStatus: "standby",
      detailsPath: "/drone/missions/mission-planned-id",
      droneId: "drone-standby-id",
      droneName: "Drone Standby Recette",
      estimatedDurationMinutes: 30,
      flightId: "flight-planned-id",
      flightName: "Vol façade sud",
      flightStatus: "planned",
      id: "mission-planned-id",
      missionDate: "2026-07-07T09:30:00.000Z",
      siteId: "site-recette-id",
      siteName: "Base Drone Recette",
      status: "planned",
    },
  ],
  navigationShortcuts: [
    {
      description: "Accéder au détail de la mission drone.",
      label: "Ouvrir mission Base Drone Recette",
      missionId: "mission-active-id",
      path: "/drone/missions/mission-active-id",
      siteId: "site-recette-id",
      type: "mission_details",
    },
  ],
  organizationId: "organization-id",
  realTimeAvailable: false,
  refreshIntervalSeconds: 30,
  refreshMode: "http_polling",
  siteId: null,
  stats: {
    activeMissionsCount: 1,
    assignedMissionsCount: 2,
    averageBatteryPercent: 45,
    connectedDronesCount: 1,
    plannedMissionsCount: 1,
    technicalAlertsCount: 1,
  },
  technicalAlerts: [
    {
      detectedAt: "2026-07-06T08:00:00.000Z",
      detailsPath: "/drone/missions/mission-active-id",
      droneId: "drone-connected-id",
      id: "mission-active-id:battery-low",
      message: "Batterie drone faible (18%).",
      missionId: "mission-active-id",
      severity: "warning",
      siteId: "site-recette-id",
      type: "battery_low",
    },
  ],
};
