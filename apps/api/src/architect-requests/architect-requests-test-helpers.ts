import type { QueryResultRow } from "pg";

import type { DatabaseService } from "../database/database.service.js";
import type { JsonObject } from "../database/database.types.js";
import { architectRequestCreatedAuditAction } from "./architect-requests.types.js";

export interface ArchitectRequestAuditLogDatabaseRow extends QueryResultRow {
  readonly action: string;
  readonly actor_user_id: string;
  readonly metadata: JsonObject;
  readonly organization_id: string;
}

export interface ArchitectRequestDatabaseRow extends QueryResultRow {
  readonly id: string;
  readonly site_id: string;
  readonly organization_id: string;
  readonly requested_by: string;
  readonly mission_description: string | null;
  readonly requested_date: string | null;
  readonly status: string;
}

export async function findPersistedArchitectRequest(
  databaseService: DatabaseService,
  architectRequestId: string,
): Promise<ArchitectRequestDatabaseRow | null> {
  const result = await databaseService.query<ArchitectRequestDatabaseRow>(
    `
      SELECT
        id, site_id, organization_id, requested_by,
        mission_description,
        requested_date::text AS requested_date,
        status
      FROM architect_requests
      WHERE id = $1
    `,
    [architectRequestId],
  );

  return result.rows[0] ?? null;
}

export async function countArchitectRequestsForSite(
  databaseService: DatabaseService,
  siteId: string,
): Promise<number> {
  const result = await databaseService.query<{ readonly count: string }>(
    `SELECT COUNT(*) AS count FROM architect_requests WHERE site_id = $1`,
    [siteId],
  );

  return Number(result.rows[0]?.count ?? 0);
}

export async function findArchitectRequestAuditLog(
  databaseService: DatabaseService,
  architectRequestId: string,
  action = architectRequestCreatedAuditAction,
): Promise<ArchitectRequestAuditLogDatabaseRow | null> {
  const result = await databaseService.query<ArchitectRequestAuditLogDatabaseRow>(
    `
      SELECT organization_id, actor_user_id, action, metadata
      FROM organization_audit_logs
      WHERE action = $1 AND metadata->>'architectRequestId' = $2
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [action, architectRequestId],
  );

  return result.rows[0] ?? null;
}
