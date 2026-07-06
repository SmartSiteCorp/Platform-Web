import type { DroneOperatorDashboardResponseDto } from "@/generated/api";

const droneOperatorDashboardFixture: DroneOperatorDashboardResponseDto = {
  dataSources: [
    {
      key: "drone_missions",
      label: "Missions drone",
      message: "Données calculées depuis les missions et vols autorisés.",
      status: "available",
    },
    {
      key: "telemetry",
      label: "Télémétrie",
      message: "Flux temps réel non connecté, rafraîchissement HTTP disponible.",
      status: "unavailable",
    },
  ],
  drones: [
    {
      batteryPercent: 82,
      connectionStatus: "connected",
      currentMissionId: "mission-id-1",
      currentMissionStatus: "in_progress",
      detailsPath: "/drones/drone-id-1",
      id: "drone-id-1",
      name: "Anafi-01",
    },
    {
      batteryPercent: 66,
      connectionStatus: "standby",
      currentMissionId: null,
      detailsPath: "/drones/drone-id-2",
      id: "drone-id-2",
      name: "Mavic-02",
    },
  ],
  emptyState: null,
  generatedAt: "2026-07-03T10:00:00.000Z",
  missions: [
    {
      batteryPercent: 82,
      connectionStatus: "connected",
      detailsPath: "/drone/missions/mission-id-1",
      droneId: "drone-id-1",
      droneName: "Anafi-01",
      estimatedDurationMinutes: 45,
      flightId: "flight-id-1",
      flightName: "Inspection toiture nord",
      flightStatus: "active",
      id: "mission-id-1",
      missionDate: "2026-07-07T09:00:00.000Z",
      siteId: "site-id-1",
      siteName: "Maison Berger",
      status: "in_progress",
    },
    {
      batteryPercent: null,
      connectionStatus: "standby",
      detailsPath: "/drone/missions/mission-id-2",
      droneId: null,
      droneName: null,
      estimatedDurationMinutes: 30,
      flightId: null,
      flightName: "Scan façade sud",
      flightStatus: null,
      id: "mission-id-2",
      missionDate: "2026-07-08T13:30:00.000Z",
      siteId: "site-id-1",
      siteName: "Maison Berger",
      status: "planned",
    },
  ],
  navigationShortcuts: [
    {
      description: "Accéder à la mission et à son plan de vol.",
      label: "Ouvrir Inspection toiture nord",
      missionId: "mission-id-1",
      path: "/drone/missions/mission-id-1",
      siteId: "site-id-1",
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
    assignedMissionsCount: 4,
    averageBatteryPercent: 74,
    connectedDronesCount: 2,
    plannedMissionsCount: 2,
    technicalAlertsCount: 1,
  },
  technicalAlerts: [
    {
      detectedAt: "2026-07-03T09:15:00.000Z",
      detailsPath: "/drone/missions/mission-id-1/alerts/alert-id-1",
      droneId: "drone-id-2",
      id: "alert-id-1",
      message: "Batterie faible sur Mavic-02",
      missionId: "mission-id-1",
      severity: "warning",
      siteId: "site-id-1",
      type: "battery_low",
    },
  ],
};

export function createDroneOperatorDashboardFixture(
  overrides: Partial<DroneOperatorDashboardResponseDto> = {},
): DroneOperatorDashboardResponseDto {
  return { ...droneOperatorDashboardFixture, ...overrides };
}
