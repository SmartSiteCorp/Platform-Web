import { Inject, Injectable } from "@nestjs/common";
import type { QueryResultRow } from "pg";

import { DatabaseService } from "../database/database.service.js";
import type { JsonObject, JsonValue } from "../database/database.types.js";
import { droneOperatorMissionsQuery } from "./drone-operator-dashboard.queries.js";
import {
  droneConnectionStatuses,
  droneOperatorDashboardRoleCodes,
  type DroneConnectionStatus,
  type DroneMissionStatus,
  type DroneOperatorDashboardQuery,
  type DroneOperatorDashboardRepositoryPort,
  type DroneOperatorMissionSummary,
} from "./drone-operator-dashboard.types.js";

interface DroneOperatorMissionRow extends QueryResultRow {
  readonly id: string;
  readonly site_id: string;
  readonly site_name: string;
  readonly mission_date: Date;
  readonly estimated_duration_minutes: number | null;
  readonly status: DroneMissionStatus;
  readonly telemetry: JsonObject;
  readonly flight_id: string | null;
  readonly flight_name: string | null;
  readonly flight_status: string | null;
  readonly drone_id: string | null;
  readonly drone_name: string | null;
}

type DroneOperatorDashboardQueryValues = readonly [string, string, string | null, string[]];

@Injectable()
export class DroneOperatorDashboardRepository implements DroneOperatorDashboardRepositoryPort {
  public constructor(@Inject(DatabaseService) private readonly databaseService: DatabaseService) {}

  public async listDroneOperatorMissions(
    query: DroneOperatorDashboardQuery,
  ): Promise<readonly DroneOperatorMissionSummary[]> {
    const result = await this.databaseService.query<DroneOperatorMissionRow>(
      droneOperatorMissionsQuery,
      this.createDashboardQueryValues(query),
    );

    return result.rows.map((row) => this.mapMissionSummary(row));
  }

  public async siteExistsInOrganization(siteId: string, organizationId: string): Promise<boolean> {
    const result = await this.databaseService.query<{ readonly id: string }>(
      `SELECT id FROM sites WHERE id = $1 AND organization_id = $2`,
      [siteId, organizationId],
    );

    return result.rows.length > 0;
  }

  public async userCanAccessDroneOperatorDashboard(
    siteId: string,
    userId: string,
    roleCodes: readonly string[],
  ): Promise<boolean> {
    const result = await this.databaseService.query<{ readonly site_id: string }>(
      `
        SELECT site_members.site_id
        FROM site_members
        INNER JOIN roles ON roles.id = site_members.role_id
        WHERE site_members.site_id = $1
          AND site_members.user_id = $2
          AND roles.code = ANY($3::varchar[])
        LIMIT 1
      `,
      [siteId, userId, [...roleCodes]],
    );

    return result.rows.length > 0;
  }

  private createDashboardQueryValues(
    query: DroneOperatorDashboardQuery,
  ): DroneOperatorDashboardQueryValues {
    return [query.organizationId, query.userId, query.siteId, [...droneOperatorDashboardRoleCodes]];
  }

  private mapMissionSummary(row: DroneOperatorMissionRow): DroneOperatorMissionSummary {
    return {
      batteryPercent: this.readBatteryPercent(row.telemetry),
      connectionStatus: this.resolveConnectionStatus(row.status, row.flight_status, row.telemetry),
      detailsPath: this.createMissionDetailsPath(row.id),
      droneId: row.drone_id,
      droneName: row.drone_name,
      estimatedDurationMinutes: row.estimated_duration_minutes,
      flightId: row.flight_id,
      flightName: row.flight_name,
      flightStatus: row.flight_status,
      id: row.id,
      missionDate: row.mission_date.toISOString(),
      siteId: row.site_id,
      siteName: row.site_name,
      status: row.status,
    };
  }

  private readBatteryPercent(telemetry: JsonObject): number | null {
    const batteryValue = this.readTelemetryNumber(telemetry, ["batteryPercent", "battery"]);

    if (batteryValue === null) {
      return null;
    }

    return Math.min(100, Math.max(0, Math.round(batteryValue)));
  }

  private readTelemetryNumber(telemetry: JsonObject, keys: readonly string[]): number | null {
    for (const key of keys) {
      const value = telemetry[key];
      const numericValue = this.toFiniteNumber(value);

      if (numericValue !== null) {
        return numericValue;
      }
    }

    return null;
  }

  private toFiniteNumber(value: JsonValue | undefined): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value !== "string") {
      return null;
    }

    const numericValue = Number(value);

    return Number.isFinite(numericValue) ? numericValue : null;
  }

  private resolveConnectionStatus(
    missionStatus: DroneMissionStatus,
    flightStatus: string | null,
    telemetry: JsonObject,
  ): DroneConnectionStatus {
    const telemetryStatus = this.readTelemetryString(telemetry, "connectionStatus");

    if (this.isDroneConnectionStatus(telemetryStatus)) {
      return telemetryStatus;
    }

    if (missionStatus === "in_progress" || flightStatus === "in_progress") {
      return "connected";
    }

    if (missionStatus === "planned" || missionStatus === "ready") {
      return "standby";
    }

    if (missionStatus === "failed" || flightStatus === "failed") {
      return "offline";
    }

    return "unknown";
  }

  private readTelemetryString(telemetry: JsonObject, key: string): string | null {
    const value = telemetry[key];

    return typeof value === "string" ? value : null;
  }

  private isDroneConnectionStatus(value: string | null): value is DroneConnectionStatus {
    return droneConnectionStatuses.some((status) => status === value);
  }

  private createMissionDetailsPath(missionId: string): string {
    return `/drone/missions/${missionId}`;
  }
}
