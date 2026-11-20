import type { QueryResultRow } from "pg";

import type { DatabaseService } from "../database/database.service.js";
import type { JsonObject } from "../database/database.types.js";
import { phaseWorkersAssignedAuditAction } from "./resource-assignments.types.js";

export interface PhaseWorkerAssignmentDatabaseRow extends QueryResultRow {
  readonly assigned_by: string;
  readonly phase_id: string;
  readonly worker_user_id: string;
}

export interface ResourceAssignmentAuditLogDatabaseRow extends QueryResultRow {
  readonly action: string;
  readonly actor_user_id: string;
  readonly changed_fields: string[];
  readonly metadata: JsonObject;
  readonly organization_id: string;
}

export interface CreatedTask {
  readonly id: string;
}

export async function findPhaseWorkerAssignments(
  databaseService: DatabaseService,
  phaseId: string,
): Promise<readonly PhaseWorkerAssignmentDatabaseRow[]> {
  const result = await databaseService.query<PhaseWorkerAssignmentDatabaseRow>(
    `
      SELECT phase_id, worker_user_id, assigned_by
      FROM phase_worker_assignments
      WHERE phase_id = $1
      ORDER BY worker_user_id
    `,
    [phaseId],
  );

  return result.rows;
}

export async function countWorkerPhaseAssignments(
  databaseService: DatabaseService,
  workerUserId: string,
): Promise<number> {
  const result = await databaseService.query<{ readonly count: string }>(
    `
      SELECT COUNT(*) AS count
      FROM phase_worker_assignments
      WHERE worker_user_id = $1
    `,
    [workerUserId],
  );

  return Number(result.rows[0]?.count ?? 0);
}

export async function findResourceAssignmentAuditLog(
  databaseService: DatabaseService,
  phaseId: string,
): Promise<ResourceAssignmentAuditLogDatabaseRow | null> {
  const result = await databaseService.query<ResourceAssignmentAuditLogDatabaseRow>(
    `
      SELECT organization_id, actor_user_id, action, changed_fields, metadata
      FROM organization_audit_logs
      WHERE action = $1 AND metadata->>'phaseId' = $2
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [phaseWorkersAssignedAuditAction, phaseId],
  );

  return result.rows[0] ?? null;
}

export async function createTaskForPhase(
  databaseService: DatabaseService,
  input: {
    readonly createdBy: string;
    readonly dueDate?: string;
    readonly phaseId: string;
    readonly siteId: string;
    readonly title: string;
  },
): Promise<CreatedTask> {
  const result = await databaseService.query<CreatedTask>(
    `
      INSERT INTO tasks (site_id, phase_id, title, due_date, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
    [input.siteId, input.phaseId, input.title, input.dueDate ?? null, input.createdBy],
  );
  const task = result.rows[0];

  if (!task) {
    throw new Error("La tâche de test n'a pas pu être créée.");
  }

  return task;
}
