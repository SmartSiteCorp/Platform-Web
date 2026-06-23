import type { JsonObject } from "../database/database.types.js";
import type { QueryResultRow } from "pg";

import { DatabaseService } from "../database/database.service.js";

export interface SiteAuditLogDatabaseRow extends QueryResultRow {
  readonly organization_id: string;
  readonly actor_user_id: string;
  readonly action: string;
  readonly metadata: JsonObject;
}

export interface SiteDatabaseRow extends QueryResultRow {
  readonly id: string;
  readonly organization_id: string;
  readonly name: string;
  readonly status: string;
}

export async function findPersistedSite(
  databaseService: DatabaseService,
  siteId: string,
): Promise<SiteDatabaseRow | null> {
  const result = await databaseService.query<SiteDatabaseRow>(
    `SELECT id, organization_id, name, status FROM sites WHERE id = $1`,
    [siteId],
  );

  return result.rows[0] ?? null;
}

export async function findSiteAuditLog(
  databaseService: DatabaseService,
  siteId: string,
): Promise<SiteAuditLogDatabaseRow | null> {
  const result = await databaseService.query<SiteAuditLogDatabaseRow>(
    `
      SELECT organization_id, actor_user_id, action, metadata
      FROM organization_audit_logs
      WHERE action = 'site.created' AND metadata->>'siteId' = $1
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [siteId],
  );

  return result.rows[0] ?? null;
}

export async function setUserRoles(
  databaseService: DatabaseService,
  userId: string,
  roleCodes: readonly string[],
): Promise<void> {
  await databaseService.query("DELETE FROM user_roles WHERE user_id = $1", [userId]);
  await databaseService.query(
    `
      INSERT INTO user_roles (user_id, role_id)
      SELECT $1, roles.id FROM roles WHERE roles.code = ANY($2::varchar[])
    `,
    [userId, [...roleCodes]],
  );
}
