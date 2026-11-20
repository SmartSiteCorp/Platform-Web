import type { QueryResultRow } from "pg";

import type { DatabaseService } from "../database/database.service.js";
import type { JsonObject } from "../database/database.types.js";
import { phaseCreatedAuditAction } from "./phases.types.js";

export interface PhaseAuditLogDatabaseRow extends QueryResultRow {
  readonly action: string;
  readonly actor_user_id: string;
  readonly changed_fields: string[];
  readonly metadata: JsonObject;
  readonly organization_id: string;
}

export interface PhaseDatabaseRow extends QueryResultRow {
  readonly id: string;
  readonly site_id: string;
  readonly name: string;
  readonly description: string | null;
  readonly estimated_duration_days: number | null;
  readonly position: number;
  readonly start_date: string | null;
  readonly status: string;
  readonly updated_at: Date;
}

export async function findPersistedPhase(
  databaseService: DatabaseService,
  phaseId: string,
): Promise<PhaseDatabaseRow | null> {
  const result = await databaseService.query<PhaseDatabaseRow>(
    `
      SELECT
        id,
        site_id,
        name,
        description,
        estimated_duration_days,
        position,
        start_date::text AS start_date,
        status,
        updated_at
      FROM phases
      WHERE id = $1
    `,
    [phaseId],
  );

  return result.rows[0] ?? null;
}

export async function countPhasesForSite(
  databaseService: DatabaseService,
  siteId: string,
): Promise<number> {
  const result = await databaseService.query<{ readonly count: string }>(
    `SELECT COUNT(*) AS count FROM phases WHERE site_id = $1`,
    [siteId],
  );

  return Number(result.rows[0]?.count ?? 0);
}

export async function findPhasesBySiteOrdered(
  databaseService: DatabaseService,
  siteId: string,
): Promise<readonly PhaseDatabaseRow[]> {
  const result = await databaseService.query<PhaseDatabaseRow>(
    `
      SELECT
        id,
        site_id,
        name,
        description,
        estimated_duration_days,
        position,
        start_date::text AS start_date,
        status,
        updated_at
      FROM phases
      WHERE site_id = $1
      ORDER BY position ASC
    `,
    [siteId],
  );

  return result.rows;
}

export async function findPhaseAuditLog(
  databaseService: DatabaseService,
  phaseId: string,
  action = phaseCreatedAuditAction,
): Promise<PhaseAuditLogDatabaseRow | null> {
  const result = await databaseService.query<PhaseAuditLogDatabaseRow>(
    `
      SELECT organization_id, actor_user_id, action, changed_fields, metadata
      FROM organization_audit_logs
      WHERE action = $1 AND metadata->>'phaseId' = $2
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [action, phaseId],
  );

  return result.rows[0] ?? null;
}

export async function findSiteMemberRoleCodes(
  databaseService: DatabaseService,
  siteId: string,
  userId: string,
): Promise<readonly string[]> {
  const result = await databaseService.query<{ readonly role_codes: string[] }>(
    `
      SELECT COALESCE(array_agg(roles.code ORDER BY roles.code), ARRAY[]::varchar[]) AS role_codes
      FROM site_members
      INNER JOIN roles ON roles.id = site_members.role_id
      WHERE site_members.site_id = $1 AND site_members.user_id = $2
    `,
    [siteId, userId],
  );

  return result.rows[0]?.role_codes ?? [];
}

export async function setSiteMemberRoles(
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
