export const droneOperatorDashboardRoleCodes = ["droniste", "administrateur"] as const;
export const droneOperatorDashboardViewedAuditAction = "dashboard.drone_operator_viewed";

export const droneMissionStatuses = [
  "planned",
  "ready",
  "in_progress",
  "completed",
  "cancelled",
  "failed",
] as const;
export type DroneMissionStatus = (typeof droneMissionStatuses)[number];

export const droneConnectionStatuses = ["connected", "standby", "offline", "unknown"] as const;
export type DroneConnectionStatus = (typeof droneConnectionStatuses)[number];

export const droneTechnicalAlertSeverities = ["warning", "critical"] as const;
export type DroneTechnicalAlertSeverity = (typeof droneTechnicalAlertSeverities)[number];

export interface DroneOperatorDashboardQuery {
  readonly organizationId: string;
  readonly siteId: string | null;
  readonly userId: string;
}

export interface DroneOperatorDashboardAuditInput {
  readonly actorUserId: string;
  readonly organizationId: string;
  readonly siteId: string | null;
  readonly visibleDroneCount: number;
  readonly visibleMissionCount: number;
  readonly visibleTechnicalAlertCount: number;
}

export interface DroneOperatorMissionSummary {
  readonly id: string;
  readonly siteId: string;
  readonly siteName: string;
  readonly missionDate: string;
  readonly estimatedDurationMinutes: number | null;
  readonly status: DroneMissionStatus;
  readonly flightId: string | null;
  readonly flightName: string | null;
  readonly flightStatus: string | null;
  readonly droneId: string | null;
  readonly droneName: string | null;
  readonly batteryPercent: number | null;
  readonly connectionStatus: DroneConnectionStatus;
  readonly detailsPath: string;
}

export interface DroneOperatorDroneSummary {
  readonly id: string;
  readonly name: string;
  readonly connectionStatus: DroneConnectionStatus;
  readonly batteryPercent: number | null;
  readonly currentMissionId: string | null;
  readonly currentMissionStatus: DroneMissionStatus | null;
  readonly detailsPath: string;
}

export interface DroneOperatorTechnicalAlert {
  readonly id: string;
  readonly type: string;
  readonly severity: DroneTechnicalAlertSeverity;
  readonly message: string;
  readonly missionId: string;
  readonly siteId: string;
  readonly droneId: string | null;
  readonly detectedAt: string;
  readonly detailsPath: string;
}

export interface DroneOperatorDashboardStats {
  readonly assignedMissionsCount: number;
  readonly plannedMissionsCount: number;
  readonly activeMissionsCount: number;
  readonly connectedDronesCount: number;
  readonly averageBatteryPercent: number | null;
  readonly technicalAlertsCount: number;
}

export interface DroneOperatorDashboardEmptyState {
  readonly title: string;
  readonly message: string;
}

export interface DroneOperatorDashboardDetails {
  readonly organizationId: string;
  readonly siteId: string | null;
  readonly generatedAt: string;
  readonly refreshMode: "http_polling";
  readonly refreshIntervalSeconds: number;
  readonly realTimeAvailable: boolean;
  readonly stats: DroneOperatorDashboardStats;
  readonly missions: readonly DroneOperatorMissionSummary[];
  readonly drones: readonly DroneOperatorDroneSummary[];
  readonly technicalAlerts: readonly DroneOperatorTechnicalAlert[];
  readonly navigationShortcuts: readonly DroneOperatorNavigationShortcut[];
  readonly dataSources: readonly DroneOperatorDataSource[];
  readonly emptyState: DroneOperatorDashboardEmptyState | null;
}

export interface DroneOperatorNavigationShortcut {
  readonly label: string;
  readonly description: string;
  readonly path: string;
  readonly missionId: string | null;
  readonly siteId: string | null;
  readonly type: string;
}

export interface DroneOperatorDataSource {
  readonly key: string;
  readonly label: string;
  readonly status: "available" | "empty" | "unavailable";
  readonly message: string;
}

export interface DroneOperatorDashboardRepositoryPort {
  listDroneOperatorMissions(
    query: DroneOperatorDashboardQuery,
  ): Promise<readonly DroneOperatorMissionSummary[]>;
  recordDroneOperatorDashboardAccess(input: DroneOperatorDashboardAuditInput): Promise<void>;
  siteExistsInOrganization(siteId: string, organizationId: string): Promise<boolean>;
  userCanAccessDroneOperatorDashboard(
    siteId: string,
    userId: string,
    roleCodes: readonly string[],
  ): Promise<boolean>;
}
