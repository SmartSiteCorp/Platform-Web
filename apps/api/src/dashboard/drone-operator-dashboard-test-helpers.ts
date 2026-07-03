import type { Response } from "supertest";

import type { DatabaseService } from "../database/database.service.js";
import type { JsonObject } from "../database/database.types.js";
import type { DroneOperatorDashboardResponseDto } from "./drone-operator-dashboard.dto.js";

interface CreateDroneDeviceOptions {
  readonly name?: string;
}

interface CreateDroneMissionOptions {
  readonly estimatedDurationMinutes?: number | null;
  readonly missionDate?: string;
  readonly status?: string;
  readonly telemetry?: JsonObject;
}

interface CreateDroneFlightOptions {
  readonly flightMode?: string;
  readonly name?: string;
  readonly status?: string;
}

export async function setDashboardSiteMemberRoles(
  databaseService: DatabaseService,
  siteId: string,
  userId: string,
  roleCodes: readonly string[],
): Promise<void> {
  await databaseService.query("DELETE FROM site_members WHERE site_id = $1 AND user_id = $2", [
    siteId,
    userId,
  ]);
  await databaseService.query(
    `
      INSERT INTO site_members (site_id, user_id, role_id)
      SELECT $1, $2, roles.id FROM roles WHERE roles.code = ANY($3::varchar[])
    `,
    [siteId, userId, [...roleCodes]],
  );
}

export async function createDashboardDroneDevice(
  databaseService: DatabaseService,
  organizationId: string,
  options: CreateDroneDeviceOptions = {},
): Promise<string> {
  const result = await databaseService.query<{ readonly id: string }>(
    `
      INSERT INTO devices (organization_id, name, type)
      VALUES ($1, $2, 'drone')
      RETURNING id
    `,
    [organizationId, options.name ?? "Drone Dashboard"],
  );
  const deviceId = result.rows[0]?.id;

  if (!deviceId) {
    throw new Error("Drone dashboard non créé.");
  }

  return deviceId;
}

export async function createDashboardDroneMission(
  databaseService: DatabaseService,
  siteId: string,
  dronistId: string,
  options: CreateDroneMissionOptions = {},
): Promise<string> {
  const result = await databaseService.query<{ readonly id: string }>(
    `
      INSERT INTO drone_missions
        (site_id, dronist_id, mission_date, estimated_duration_minutes, status, telemetry)
      VALUES ($1, $2, $3, $4, $5::mission_status, $6::jsonb)
      RETURNING id
    `,
    [
      siteId,
      dronistId,
      options.missionDate ?? "2026-07-04T08:00:00.000Z",
      options.estimatedDurationMinutes ?? 45,
      options.status ?? "planned",
      JSON.stringify(options.telemetry ?? {}),
    ],
  );
  const missionId = result.rows[0]?.id;

  if (!missionId) {
    throw new Error("Mission drone dashboard non créée.");
  }

  return missionId;
}

export async function createDashboardDroneFlight(
  databaseService: DatabaseService,
  missionId: string,
  userId: string,
  droneDeviceId: string,
  options: CreateDroneFlightOptions = {},
): Promise<string> {
  const result = await databaseService.query<{ readonly id: string }>(
    `
      INSERT INTO flights
        (drone_mission_id, user_id, drone_device_id, name, flight_mode, status, planned_date)
      VALUES ($1, $2, $3, $4, $5, $6, '2026-07-04T08:15:00.000Z')
      RETURNING id
    `,
    [
      missionId,
      userId,
      droneDeviceId,
      options.name ?? "Vol dashboard",
      options.flightMode ?? "photogrammetry",
      options.status ?? "planned",
    ],
  );
  const flightId = result.rows[0]?.id;

  if (!flightId) {
    throw new Error("Vol drone dashboard non créé.");
  }

  return flightId;
}

export function parseDroneOperatorDashboardResponse(
  response: Response,
): DroneOperatorDashboardResponseDto {
  return JSON.parse(response.text) as DroneOperatorDashboardResponseDto;
}
