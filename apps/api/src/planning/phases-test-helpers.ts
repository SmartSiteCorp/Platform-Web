import type { QueryResultRow } from "pg";

import type { DatabaseService } from "../database/database.service.js";

export interface PhaseDatabaseRow extends QueryResultRow {
  readonly id: string;
  readonly site_id: string;
  readonly name: string;
  readonly description: string | null;
  readonly position: number;
  readonly status: string;
}

export async function findPersistedPhase(
  databaseService: DatabaseService,
  phaseId: string,
): Promise<PhaseDatabaseRow | null> {
  const result = await databaseService.query<PhaseDatabaseRow>(
    `SELECT id, site_id, name, description, position, status FROM phases WHERE id = $1`,
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
    `SELECT id, site_id, name, description, position, status FROM phases WHERE site_id = $1 ORDER BY position ASC`,
    [siteId],
  );

  return result.rows;
}
