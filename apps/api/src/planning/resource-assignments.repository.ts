import { Inject, Injectable } from "@nestjs/common";
import type { QueryResultRow } from "pg";

import { DatabaseService } from "../database/database.service.js";
import type { DatabaseExecutor, JsonObject } from "../database/database.types.js";
import type {
  AssignPhaseWorkersInput,
  PhaseWorkerAssignmentDetails,
  ResourceAssignmentsRepositoryPort,
  WorkerAssignedTaskDetails,
} from "./resource-assignments.types.js";
import { phaseWorkersAssignedAuditAction } from "./resource-assignments.types.js";

interface PhaseWorkerAssignmentRow extends QueryResultRow {
  readonly assigned_at: Date;
  readonly phase_id: string;
  readonly site_id: string;
  readonly worker_first_name: string;
  readonly worker_last_name: string;
  readonly worker_user_id: string;
}

interface WorkerAssignedTaskRow extends QueryResultRow {
  readonly description: string | null;
  readonly due_date: string | null;
  readonly id: string;
  readonly phase_id: string;
  readonly phase_name: string;
  readonly site_id: string;
  readonly status: string;
  readonly title: string;
}

@Injectable()
export class ResourceAssignmentsRepository implements ResourceAssignmentsRepositoryPort {
  public constructor(@Inject(DatabaseService) private readonly databaseService: DatabaseService) {}

  public async siteExistsInOrganization(siteId: string, organizationId: string): Promise<boolean> {
    const result = await this.databaseService.query<{ readonly id: string }>(
      `SELECT id FROM sites WHERE id = $1 AND organization_id = $2`,
      [siteId, organizationId],
    );

    return result.rows.length > 0;
  }

  public async phaseExistsInSite(siteId: string, phaseId: string): Promise<boolean> {
    const result = await this.databaseService.query<{ readonly id: string }>(
      `SELECT id FROM phases WHERE id = $1 AND site_id = $2`,
      [phaseId, siteId],
    );

    return result.rows.length > 0;
  }

  public async userHasSiteRole(
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

  public async findAssignableWorkerIds(
    siteId: string,
    organizationId: string,
    workerUserIds: readonly string[],
  ): Promise<readonly string[]> {
    const result = await this.databaseService.query<{ readonly id: string }>(
      `
        SELECT users.id
        FROM users
        WHERE users.organization_id = $1
          AND users.status = 'active'
          AND users.id = ANY($2::uuid[])
          AND EXISTS (
            SELECT 1
            FROM user_roles
            INNER JOIN roles ON roles.id = user_roles.role_id
            WHERE user_roles.user_id = users.id
              AND roles.code = 'ouvrier'
          )
          AND EXISTS (
            SELECT 1
            FROM site_members
            INNER JOIN roles ON roles.id = site_members.role_id
            WHERE site_members.site_id = $3
              AND site_members.user_id = users.id
              AND roles.code = 'ouvrier'
          )
      `,
      [organizationId, [...workerUserIds], siteId],
    );

    return result.rows.map((row) => row.id);
  }

  public async assignWorkersToPhase(
    input: AssignPhaseWorkersInput,
  ): Promise<readonly PhaseWorkerAssignmentDetails[]> {
    return this.databaseService.withTransaction(async (transaction) => {
      const insertedRows = await this.insertPhaseWorkerAssignments(transaction, input);

      if (insertedRows > 0) {
        await this.insertAssignmentAuditLog(transaction, input, insertedRows);
      }

      return this.findPhaseAssignmentsByWorkers(transaction, input.phaseId, input.workerUserIds);
    });
  }

  public async listPhaseWorkerAssignments(
    siteId: string,
    phaseId: string,
  ): Promise<readonly PhaseWorkerAssignmentDetails[]> {
    const result = await this.databaseService.query<PhaseWorkerAssignmentRow>(
      `
        SELECT
          phases.site_id,
          phase_worker_assignments.phase_id,
          phase_worker_assignments.worker_user_id,
          users.first_name AS worker_first_name,
          users.last_name AS worker_last_name,
          phase_worker_assignments.assigned_at
        FROM phase_worker_assignments
        INNER JOIN phases ON phases.id = phase_worker_assignments.phase_id
        INNER JOIN users ON users.id = phase_worker_assignments.worker_user_id
        WHERE phase_worker_assignments.phase_id = $1
          AND phases.site_id = $2
        ORDER BY lower(users.last_name), lower(users.first_name), users.id
      `,
      [phaseId, siteId],
    );

    return result.rows.map((row) => this.mapPhaseWorkerAssignment(row));
  }

  public async listWorkerAssignedTasks(
    siteId: string,
    workerUserId: string,
  ): Promise<readonly WorkerAssignedTaskDetails[]> {
    const result = await this.databaseService.query<WorkerAssignedTaskRow>(
      `
        SELECT
          tasks.id,
          tasks.site_id,
          tasks.phase_id,
          phases.name AS phase_name,
          tasks.title,
          tasks.description,
          tasks.status,
          tasks.due_date::text AS due_date
        FROM phase_worker_assignments
        INNER JOIN phases ON phases.id = phase_worker_assignments.phase_id
        INNER JOIN tasks ON tasks.phase_id = phases.id AND tasks.site_id = phases.site_id
        WHERE phases.site_id = $1
          AND phase_worker_assignments.worker_user_id = $2
        ORDER BY tasks.due_date ASC NULLS LAST, tasks.title ASC, tasks.id ASC
      `,
      [siteId, workerUserId],
    );

    return result.rows.map((row) => this.mapWorkerAssignedTask(row));
  }

  private async insertPhaseWorkerAssignments(
    transaction: DatabaseExecutor,
    input: AssignPhaseWorkersInput,
  ): Promise<number> {
    const result = await transaction.query<{ readonly worker_user_id: string }>(
      `
        INSERT INTO phase_worker_assignments (phase_id, worker_user_id, assigned_by)
        SELECT $1, unnest($2::uuid[]), $3
        ON CONFLICT DO NOTHING
        RETURNING worker_user_id
      `,
      [input.phaseId, [...input.workerUserIds], input.assignedBy],
    );

    return result.rows.length;
  }

  private async findPhaseAssignmentsByWorkers(
    transaction: DatabaseExecutor,
    phaseId: string,
    workerUserIds: readonly string[],
  ): Promise<readonly PhaseWorkerAssignmentDetails[]> {
    const result = await transaction.query<PhaseWorkerAssignmentRow>(
      `
        SELECT
          phases.site_id,
          phase_worker_assignments.phase_id,
          phase_worker_assignments.worker_user_id,
          users.first_name AS worker_first_name,
          users.last_name AS worker_last_name,
          phase_worker_assignments.assigned_at
        FROM phase_worker_assignments
        INNER JOIN phases ON phases.id = phase_worker_assignments.phase_id
        INNER JOIN users ON users.id = phase_worker_assignments.worker_user_id
        WHERE phase_worker_assignments.phase_id = $1
          AND phase_worker_assignments.worker_user_id = ANY($2::uuid[])
        ORDER BY lower(users.last_name), lower(users.first_name), users.id
      `,
      [phaseId, [...workerUserIds]],
    );

    return result.rows.map((row) => this.mapPhaseWorkerAssignment(row));
  }

  private async insertAssignmentAuditLog(
    transaction: DatabaseExecutor,
    input: AssignPhaseWorkersInput,
    insertedRows: number,
  ): Promise<void> {
    const metadata: JsonObject = {
      assignedCount: insertedRows,
      phaseId: input.phaseId,
      siteId: input.siteId,
    };

    await transaction.query(
      `
        INSERT INTO organization_audit_logs
          (organization_id, actor_user_id, action, changed_fields, metadata)
        VALUES ($1, $2, $3, $4, $5::jsonb)
      `,
      [
        input.organizationId,
        input.assignedBy,
        phaseWorkersAssignedAuditAction,
        ["workerUserIds"],
        JSON.stringify(metadata),
      ],
    );
  }

  private mapPhaseWorkerAssignment(row: PhaseWorkerAssignmentRow): PhaseWorkerAssignmentDetails {
    return {
      assignedAt: row.assigned_at.toISOString(),
      phaseId: row.phase_id,
      siteId: row.site_id,
      workerFirstName: row.worker_first_name,
      workerLastName: row.worker_last_name,
      workerUserId: row.worker_user_id,
    };
  }

  private mapWorkerAssignedTask(row: WorkerAssignedTaskRow): WorkerAssignedTaskDetails {
    return {
      description: row.description,
      dueDate: row.due_date,
      id: row.id,
      phaseId: row.phase_id,
      phaseName: row.phase_name,
      siteId: row.site_id,
      status: row.status,
      title: row.title,
    };
  }
}
