import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";

import {
  droneConnectionStatuses,
  droneMissionStatuses,
  droneTechnicalAlertSeverities,
} from "./drone-operator-dashboard.types.js";

export class DroneOperatorDashboardQueryDto {
  @ApiPropertyOptional({
    description: "Filtre optionnel sur un chantier accessible au droniste.",
    example: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    type: String,
  })
  @IsOptional()
  @IsUUID("4", { message: "Le chantier doit être identifié par un UUID valide." })
  public readonly siteId?: string;
}

export class DroneOperatorDashboardStatsResponseDto {
  @ApiProperty({ example: 6, type: Number })
  public readonly assignedMissionsCount!: number;

  @ApiProperty({ example: 3, type: Number })
  public readonly plannedMissionsCount!: number;

  @ApiProperty({ example: 1, type: Number })
  public readonly activeMissionsCount!: number;

  @ApiProperty({ example: 2, type: Number })
  public readonly connectedDronesCount!: number;

  @ApiPropertyOptional({ example: 72, nullable: true, type: Number })
  public readonly averageBatteryPercent!: number | null;

  @ApiProperty({ example: 1, type: Number })
  public readonly technicalAlertsCount!: number;
}

export class DroneOperatorMissionResponseDto {
  @ApiProperty({ example: "f47ac10b-58cc-4372-a567-0e02b2c3d479", type: String })
  public readonly id!: string;

  @ApiProperty({ example: "30eb69f8-82cd-4b04-8d88-8a2f64b8d6d8", type: String })
  public readonly siteId!: string;

  @ApiProperty({ example: "Résidence Horizon", type: String })
  public readonly siteName!: string;

  @ApiProperty({ example: "2026-07-03T08:30:00.000Z", type: String })
  public readonly missionDate!: string;

  @ApiPropertyOptional({ example: 45, nullable: true, type: Number })
  public readonly estimatedDurationMinutes!: number | null;

  @ApiProperty({ enum: droneMissionStatuses, example: "planned", type: String })
  public readonly status!: string;

  @ApiPropertyOptional({ example: "flight-id", nullable: true, type: String })
  public readonly flightId!: string | null;

  @ApiPropertyOptional({ example: "Survol façade nord", nullable: true, type: String })
  public readonly flightName!: string | null;

  @ApiPropertyOptional({ example: "planned", nullable: true, type: String })
  public readonly flightStatus!: string | null;

  @ApiPropertyOptional({ example: "drone-id", nullable: true, type: String })
  public readonly droneId!: string | null;

  @ApiPropertyOptional({ example: "Drone Alpha", nullable: true, type: String })
  public readonly droneName!: string | null;

  @ApiPropertyOptional({ example: 82, nullable: true, type: Number })
  public readonly batteryPercent!: number | null;

  @ApiProperty({ enum: droneConnectionStatuses, example: "connected", type: String })
  public readonly connectionStatus!: string;

  @ApiProperty({ example: "/drone/missions/f47ac10b-58cc-4372-a567-0e02b2c3d479", type: String })
  public readonly detailsPath!: string;
}

export class DroneOperatorDroneResponseDto {
  @ApiProperty({ example: "drone-id", type: String })
  public readonly id!: string;

  @ApiProperty({ example: "Drone Alpha", type: String })
  public readonly name!: string;

  @ApiProperty({ enum: droneConnectionStatuses, example: "connected", type: String })
  public readonly connectionStatus!: string;

  @ApiPropertyOptional({ example: 82, nullable: true, type: Number })
  public readonly batteryPercent!: number | null;

  @ApiPropertyOptional({ example: "mission-id", nullable: true, type: String })
  public readonly currentMissionId!: string | null;

  @ApiPropertyOptional({ enum: droneMissionStatuses, example: "in_progress", nullable: true })
  public readonly currentMissionStatus!: string | null;

  @ApiProperty({ example: "/drone/devices/drone-id", type: String })
  public readonly detailsPath!: string;
}

export class DroneOperatorTechnicalAlertResponseDto {
  @ApiProperty({ example: "mission-id:battery-low", type: String })
  public readonly id!: string;

  @ApiProperty({ example: "battery_low", type: String })
  public readonly type!: string;

  @ApiProperty({ enum: droneTechnicalAlertSeverities, example: "warning", type: String })
  public readonly severity!: string;

  @ApiProperty({ example: "Batterie drone faible.", type: String })
  public readonly message!: string;

  @ApiProperty({ example: "mission-id", type: String })
  public readonly missionId!: string;

  @ApiProperty({ example: "site-id", type: String })
  public readonly siteId!: string;

  @ApiPropertyOptional({ example: "drone-id", nullable: true, type: String })
  public readonly droneId!: string | null;

  @ApiProperty({ example: "2026-07-03T08:30:00.000Z", type: String })
  public readonly detectedAt!: string;

  @ApiProperty({ example: "/drone/missions/mission-id", type: String })
  public readonly detailsPath!: string;
}

export class DroneOperatorNavigationShortcutResponseDto {
  @ApiProperty({ example: "Ouvrir mission Résidence Horizon", type: String })
  public readonly label!: string;

  @ApiProperty({ example: "Accéder au détail de la mission drone.", type: String })
  public readonly description!: string;

  @ApiProperty({ example: "/drone/missions/mission-id", type: String })
  public readonly path!: string;

  @ApiPropertyOptional({ example: "mission-id", nullable: true, type: String })
  public readonly missionId!: string | null;

  @ApiPropertyOptional({ example: "site-id", nullable: true, type: String })
  public readonly siteId!: string | null;

  @ApiProperty({ example: "mission_details", type: String })
  public readonly type!: string;
}

export class DroneOperatorDataSourceResponseDto {
  @ApiProperty({ example: "drone_missions", type: String })
  public readonly key!: string;

  @ApiProperty({ example: "Missions drone", type: String })
  public readonly label!: string;

  @ApiProperty({ example: "available", type: String })
  public readonly status!: string;

  @ApiProperty({ example: "Missions calculées depuis les données persistées.", type: String })
  public readonly message!: string;
}

export class DroneOperatorDashboardEmptyStateResponseDto {
  @ApiProperty({ example: "Aucune mission drone accessible", type: String })
  public readonly title!: string;

  @ApiProperty({
    example: "Aucune mission drone n'est associée à votre compte pour le moment.",
    type: String,
  })
  public readonly message!: string;
}

export class DroneOperatorDashboardResponseDto {
  @ApiProperty({ example: "0b7fd7c8-f6ea-4011-a87d-589d2f3fba4e", type: String })
  public readonly organizationId!: string;

  @ApiPropertyOptional({ example: "site-id", nullable: true, type: String })
  public readonly siteId!: string | null;

  @ApiProperty({ example: "2026-07-03T08:30:00.000Z", type: String })
  public readonly generatedAt!: string;

  @ApiProperty({ example: "http_polling", type: String })
  public readonly refreshMode!: string;

  @ApiProperty({ example: 30, type: Number })
  public readonly refreshIntervalSeconds!: number;

  @ApiProperty({ example: false, type: Boolean })
  public readonly realTimeAvailable!: boolean;

  @ApiProperty({ type: DroneOperatorDashboardStatsResponseDto })
  public readonly stats!: DroneOperatorDashboardStatsResponseDto;

  @ApiProperty({ isArray: true, type: DroneOperatorMissionResponseDto })
  public readonly missions!: readonly DroneOperatorMissionResponseDto[];

  @ApiProperty({ isArray: true, type: DroneOperatorDroneResponseDto })
  public readonly drones!: readonly DroneOperatorDroneResponseDto[];

  @ApiProperty({ isArray: true, type: DroneOperatorTechnicalAlertResponseDto })
  public readonly technicalAlerts!: readonly DroneOperatorTechnicalAlertResponseDto[];

  @ApiProperty({ isArray: true, type: DroneOperatorNavigationShortcutResponseDto })
  public readonly navigationShortcuts!: readonly DroneOperatorNavigationShortcutResponseDto[];

  @ApiProperty({ isArray: true, type: DroneOperatorDataSourceResponseDto })
  public readonly dataSources!: readonly DroneOperatorDataSourceResponseDto[];

  @ApiPropertyOptional({ nullable: true, type: DroneOperatorDashboardEmptyStateResponseDto })
  public readonly emptyState!: DroneOperatorDashboardEmptyStateResponseDto | null;
}
