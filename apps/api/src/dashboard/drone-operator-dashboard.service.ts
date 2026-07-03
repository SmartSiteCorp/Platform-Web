import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import type { AccessTokenPayload } from "../auth/auth.types.js";
import { OrganizationsService } from "../organizations/organizations.service.js";
import { getDashboardRefreshIntervalSeconds } from "../shared/config/environment.js";
import type { DroneOperatorDashboardQueryDto } from "./drone-operator-dashboard.dto.js";
import { DroneOperatorDashboardRepository } from "./drone-operator-dashboard.repository.js";
import {
  droneOperatorDashboardRoleCodes,
  type DroneOperatorDashboardDetails,
  type DroneOperatorDashboardRepositoryPort,
  type DroneOperatorDashboardStats,
  type DroneOperatorDataSource,
  type DroneOperatorDroneSummary,
  type DroneOperatorMissionSummary,
  type DroneOperatorNavigationShortcut,
  type DroneOperatorTechnicalAlert,
  type DroneTechnicalAlertSeverity,
} from "./drone-operator-dashboard.types.js";

const droneDashboardShortcutLimit = 4;
const lowBatteryWarningThreshold = 25;
const lowBatteryCriticalThreshold = 15;
const technicalAlertLimit = 8;

@Injectable()
export class DroneOperatorDashboardService {
  public constructor(
    @Inject(DroneOperatorDashboardRepository)
    private readonly dashboardRepository: DroneOperatorDashboardRepositoryPort,
    @Inject(OrganizationsService) private readonly organizationsService: OrganizationsService,
  ) {}

  public async getDroneOperatorDashboard(
    request: DroneOperatorDashboardQueryDto,
    user: AccessTokenPayload,
  ): Promise<DroneOperatorDashboardDetails> {
    await this.organizationsService.assertUserHasAnyRole(
      user.organizationId,
      user,
      droneOperatorDashboardRoleCodes,
    );

    const siteId = request.siteId ?? null;

    if (siteId) {
      await this.assertSiteDashboardAccess(siteId, user);
    }

    const missions = await this.dashboardRepository.listDroneOperatorMissions({
      organizationId: user.organizationId,
      siteId,
      userId: user.sub,
    });
    const drones = this.createDroneSummaries(missions);
    const technicalAlerts = this.createTechnicalAlerts(missions);

    return {
      dataSources: this.createDataSources(missions, drones),
      drones,
      emptyState: this.createEmptyState(missions.length),
      generatedAt: new Date().toISOString(),
      missions,
      navigationShortcuts: this.createNavigationShortcuts(missions),
      organizationId: user.organizationId,
      realTimeAvailable: false,
      refreshIntervalSeconds: getDashboardRefreshIntervalSeconds(),
      refreshMode: "http_polling",
      siteId,
      stats: this.createStats(missions, drones, technicalAlerts.length),
      technicalAlerts,
    };
  }

  private async assertSiteDashboardAccess(siteId: string, user: AccessTokenPayload): Promise<void> {
    const siteExists = await this.dashboardRepository.siteExistsInOrganization(
      siteId,
      user.organizationId,
    );

    if (!siteExists) {
      throw new NotFoundException(["Le chantier est introuvable."]);
    }

    const canAccessSite = await this.dashboardRepository.userCanAccessDroneOperatorDashboard(
      siteId,
      user.sub,
      droneOperatorDashboardRoleCodes,
    );

    if (!canAccessSite) {
      throw new ForbiddenException(["Vous n'avez pas accès à ce chantier."]);
    }
  }

  private createStats(
    missions: readonly DroneOperatorMissionSummary[],
    drones: readonly DroneOperatorDroneSummary[],
    technicalAlertsCount: number,
  ): DroneOperatorDashboardStats {
    return {
      activeMissionsCount: missions.filter((mission) => mission.status === "in_progress").length,
      assignedMissionsCount: missions.length,
      averageBatteryPercent: this.calculateAverageBatteryPercent(drones),
      connectedDronesCount: drones.filter((drone) => drone.connectionStatus === "connected").length,
      plannedMissionsCount: missions.filter((mission) =>
        ["planned", "ready"].includes(mission.status),
      ).length,
      technicalAlertsCount,
    };
  }

  private calculateAverageBatteryPercent(
    drones: readonly DroneOperatorDroneSummary[],
  ): number | null {
    const batteryValues = drones
      .map((drone) => drone.batteryPercent)
      .filter((batteryPercent): batteryPercent is number => batteryPercent !== null);

    if (batteryValues.length === 0) {
      return null;
    }

    const batteryTotal = batteryValues.reduce((sum, batteryPercent) => sum + batteryPercent, 0);

    return Math.round(batteryTotal / batteryValues.length);
  }

  private createDroneSummaries(
    missions: readonly DroneOperatorMissionSummary[],
  ): readonly DroneOperatorDroneSummary[] {
    const dronesById = new Map<string, DroneOperatorDroneSummary>();

    for (const mission of missions) {
      if (!mission.droneId || !mission.droneName || dronesById.has(mission.droneId)) {
        continue;
      }

      dronesById.set(mission.droneId, {
        batteryPercent: mission.batteryPercent,
        connectionStatus: mission.connectionStatus,
        currentMissionId: mission.id,
        currentMissionStatus: mission.status,
        detailsPath: `/drone/devices/${mission.droneId}`,
        id: mission.droneId,
        name: mission.droneName,
      });
    }

    return [...dronesById.values()];
  }

  private createTechnicalAlerts(
    missions: readonly DroneOperatorMissionSummary[],
  ): readonly DroneOperatorTechnicalAlert[] {
    const alerts: DroneOperatorTechnicalAlert[] = [];

    for (const mission of missions) {
      const batteryAlert = this.createBatteryAlert(mission);
      const failedMissionAlert = this.createFailedMissionAlert(mission);

      if (batteryAlert) alerts.push(batteryAlert);
      if (failedMissionAlert) alerts.push(failedMissionAlert);
    }

    return alerts.slice(0, technicalAlertLimit);
  }

  private createBatteryAlert(
    mission: DroneOperatorMissionSummary,
  ): DroneOperatorTechnicalAlert | null {
    if (mission.batteryPercent === null || mission.batteryPercent > lowBatteryWarningThreshold) {
      return null;
    }

    const severity: DroneTechnicalAlertSeverity =
      mission.batteryPercent <= lowBatteryCriticalThreshold ? "critical" : "warning";

    return {
      detailsPath: mission.detailsPath,
      detectedAt: mission.missionDate,
      droneId: mission.droneId,
      id: `${mission.id}:battery-low`,
      message: `Batterie drone faible (${String(mission.batteryPercent)}%).`,
      missionId: mission.id,
      severity,
      siteId: mission.siteId,
      type: "battery_low",
    };
  }

  private createFailedMissionAlert(
    mission: DroneOperatorMissionSummary,
  ): DroneOperatorTechnicalAlert | null {
    if (mission.status !== "failed" && mission.flightStatus !== "failed") {
      return null;
    }

    return {
      detailsPath: mission.detailsPath,
      detectedAt: mission.missionDate,
      droneId: mission.droneId,
      id: `${mission.id}:mission-failed`,
      message: "Mission drone en échec, intervention requise.",
      missionId: mission.id,
      severity: "critical",
      siteId: mission.siteId,
      type: "mission_failed",
    };
  }

  private createNavigationShortcuts(
    missions: readonly DroneOperatorMissionSummary[],
  ): readonly DroneOperatorNavigationShortcut[] {
    return missions.slice(0, droneDashboardShortcutLimit).map((mission) => ({
      description: "Accéder au détail de la mission drone.",
      label: `Ouvrir mission ${mission.siteName}`,
      missionId: mission.id,
      path: mission.detailsPath,
      siteId: mission.siteId,
      type: "mission_details",
    }));
  }

  private createDataSources(
    missions: readonly DroneOperatorMissionSummary[],
    drones: readonly DroneOperatorDroneSummary[],
  ): readonly DroneOperatorDataSource[] {
    const hasTelemetrySnapshot = missions.some((mission) => mission.batteryPercent !== null);

    return [
      this.createDataSource(
        "drone_missions",
        "Missions drone",
        this.resolveAvailableOrEmptyStatus(missions.length > 0),
        missions.length > 0
          ? "Missions calculées depuis les données drone persistées."
          : "Aucune mission drone accessible pour ce périmètre.",
      ),
      this.createDataSource(
        "drone_devices",
        "Drones associés",
        this.resolveAvailableOrEmptyStatus(drones.length > 0),
        drones.length > 0
          ? "Drones calculés depuis les vols liés aux missions visibles."
          : "Aucun drone lié aux missions visibles.",
      ),
      this.createDataSource(
        "telemetry_snapshots",
        "Télémétrie stockée",
        this.resolveAvailableOrEmptyStatus(hasTelemetrySnapshot),
        hasTelemetrySnapshot
          ? "Batteries calculées depuis les instantanés de télémétrie persistés."
          : "Aucun instantané de télémétrie exploitable.",
      ),
      // TODOOOOO : à remplacer avec la vraie donnée temps réel DroneControl/MAVLink.
      this.createDataSource(
        "real_time_telemetry",
        "Télémétrie temps réel",
        "unavailable",
        "Flux temps réel non connecté, réponse prête pour rafraîchissement HTTP.",
      ),
    ];
  }

  private resolveAvailableOrEmptyStatus(hasData: boolean): "available" | "empty" {
    return hasData ? "available" : "empty";
  }

  private createDataSource(
    key: string,
    label: string,
    status: DroneOperatorDataSource["status"],
    message: string,
  ): DroneOperatorDataSource {
    return { key, label, message, status };
  }

  private createEmptyState(missionCount: number) {
    if (missionCount > 0) {
      return null;
    }

    return {
      message: "Aucune mission drone n'est associée à votre compte pour le moment.",
      title: "Aucune mission drone accessible",
    };
  }
}
