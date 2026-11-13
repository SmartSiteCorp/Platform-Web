import type { QueryResultRow } from "pg";

import type { DatabaseService } from "../database/database.service.js";
import type { JsonObject } from "../database/database.types.js";
import { droneRequestCreatedAuditAction } from "./drone-requests.types.js";

export interface DroneRequestAuditLogDatabaseRow extends QueryResultRow {
  readonly action: string;
  readonly actor_user_id: string;
  readonly metadata: JsonObject;
  readonly organization_id: string;
}

export interface DroneRequestDatabaseRow extends QueryResultRow {
  readonly id: string;
  readonly site_id: string;
  readonly organization_id: string;
  readonly requested_by: string;
  readonly mission_description: string | null;
  readonly requested_date: string | null;
  readonly status: string;
}

export async function findPersistedDroneRequest(
  databaseService: DatabaseService,
  droneRequestId: string,
): Promise<DroneRequestDatabaseRow | null> {
  const result = await databaseService.query<DroneRequestDatabaseRow>(
    `
      SELECT
        id, site_id, organization_id, requested_by,
        mission_description,
        requested_date::text AS requested_date,
        status
      FROM drone_requests
      WHERE id = $1
    `,
    [droneRequestId],
  );

  return result.rows[0] ?? null;
}

export async function countDroneRequestsForSite(
  databaseService: DatabaseService,
  siteId: string,
): Promise<number> {
  const result = await databaseService.query<{ readonly count: string }>(
    `SELECT COUNT(*) AS count FROM drone_requests WHERE site_id = $1`,
    [siteId],
  );

  return Number(result.rows[0]?.count ?? 0);
}

export async function findDroneRequestAuditLog(
  databaseService: DatabaseService,
  droneRequestId: string,
  action = droneRequestCreatedAuditAction,
): Promise<DroneRequestAuditLogDatabaseRow | null> {
  const result = await databaseService.query<DroneRequestAuditLogDatabaseRow>(
    `
      SELECT organization_id, actor_user_id, action, metadata
      FROM organization_audit_logs
      WHERE action = $1 AND metadata->>'droneRequestId' = $2
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [action, droneRequestId],
  );

  return result.rows[0] ?? null;
}
