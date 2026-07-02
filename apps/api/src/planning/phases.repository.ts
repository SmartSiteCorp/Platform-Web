import { Inject, Injectable } from "@nestjs/common";
import type { QueryResultRow } from "pg";

import { DatabaseService } from "../database/database.service.js";
import type { DatabaseExecutor } from "../database/database.types.js";
import type { CreatePhaseInput, PhaseDetails, PhasesRepositoryPort } from "./phases.types.js";
import { phaseCreatedAuditAction } from "./phases.types.js";

interface PhaseRow extends QueryResultRow {
  readonly id: string;
  readonly site_id: string;
  readonly name: string;
  readonly description: string | null;
  readonly position: number;
  readonly start_date: string | null;
  readonly estimated_duration_days: number | null;
  readonly progress_percent: string;
  readonly status: string;
  readonly created_at: Date;
  readonly updated_at: Date;
}

@Injectable()
export class PhasesRepository implements PhasesRepositoryPort {
  public constructor(@Inject(DatabaseService) private readonly databaseService: DatabaseService) {}

  public async siteExistsInOrganization(siteId: string, organizationId: string): Promise<boolean> {
    const result = await this.databaseService.query<{ readonly id: string }>(
      `SELECT id FROM sites WHERE id = $1 AND organization_id = $2`,
      [siteId, organizationId],
    );

    return result.rows.length > 0;
  }

  public async userCanManageSitePhases(
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

  public async createPhase(input: CreatePhaseInput): Promise<PhaseDetails> {
    return this.databaseService.withTransaction(async (transaction) => {
      await this.lockSitePhasePosition(transaction, input.siteId);

      const result = await transaction.query<PhaseRow>(
        `
          INSERT INTO phases
            (site_id, name, description, position, start_date, estimated_duration_days)
          SELECT
            $1, $2, $3,
            COALESCE((SELECT MAX(position) FROM phases WHERE site_id = $1), 0) + 1,
            $4, $5
          RETURNING
            id, site_id, name, description, position,
            start_date::text AS start_date,
            estimated_duration_days,
            progress_percent::text AS progress_percent,
            status,
            created_at, updated_at
        `,
        [input.siteId, input.name, input.description, input.startDate, input.estimatedDurationDays],
      );

      const phase = result.rows[0];

      if (!phase) {
        throw new Error("La phase n'a pas pu être créée.");
      }

      await this.insertPhaseAuditLog(transaction, input, phase);

      return this.mapPhase(phase);
    });
  }

  private async lockSitePhasePosition(
    transaction: DatabaseExecutor,
    siteId: string,
  ): Promise<void> {
    // Le verrou est limité au chantier pour éviter les collisions de position concurrentes.
    await transaction.query("SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))", [
      siteId,
    ]);
  }

  private async insertPhaseAuditLog(
    transaction: DatabaseExecutor,
    input: CreatePhaseInput,
    phase: PhaseRow,
  ): Promise<void> {
    await transaction.query(
      `
        INSERT INTO organization_audit_logs (organization_id, actor_user_id, action, metadata)
        VALUES ($1, $2, $3, $4::jsonb)
      `,
      [
        input.organizationId,
        input.createdBy,
        phaseCreatedAuditAction,
        JSON.stringify({ phaseId: phase.id, position: phase.position, siteId: input.siteId }),
      ],
    );
  }

  private mapPhase(row: PhaseRow): PhaseDetails {
    return {
      createdAt: row.created_at.toISOString(),
      description: row.description,
      estimatedDurationDays: row.estimated_duration_days,
      id: row.id,
      name: row.name,
      position: row.position,
      progressPercent: Number(row.progress_percent),
      siteId: row.site_id,
      startDate: row.start_date,
      status: row.status,
      updatedAt: row.updated_at.toISOString(),
    };
  }
}
