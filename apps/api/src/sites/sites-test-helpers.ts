import type { QueryResultRow } from "pg";

import { DatabaseService } from "../database/database.service.js";

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
