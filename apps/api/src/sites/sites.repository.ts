import { Inject, Injectable } from "@nestjs/common";
import type { QueryResultRow } from "pg";

import { DatabaseService } from "../database/database.service.js";
import type { DatabaseExecutor } from "../database/database.types.js";
import type { CreateSiteInput, SiteDetails, SitesRepositoryPort } from "./sites.types.js";
import { siteCreatedAuditAction, siteManagementRoleCodes } from "./sites.types.js";

interface SiteRow extends QueryResultRow {
  readonly id: string;
  readonly organization_id: string;
  readonly name: string;
  readonly address: string | null;
  readonly start_date: string | null;
  readonly estimated_duration_days: number | null;
  readonly status: string;
  readonly created_by: string;
  readonly created_at: Date;
  readonly updated_at: Date;
}

@Injectable()
export class SitesRepository implements SitesRepositoryPort {
  public constructor(@Inject(DatabaseService) private readonly databaseService: DatabaseService) {}

  public async createSite(input: CreateSiteInput): Promise<SiteDetails> {
    return this.databaseService.withTransaction(async (transaction) => {
      const result = await transaction.query<SiteRow>(
        `
          INSERT INTO sites
            (organization_id, name, address, start_date, estimated_duration_days, created_by)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING
            id, organization_id, name, address,
            start_date::text AS start_date,
            estimated_duration_days, status, created_by, created_at, updated_at
        `,
        [
          input.organizationId,
          input.name,
          input.address,
          input.startDate,
          input.estimatedDurationDays,
          input.createdBy,
        ],
      );

      const site = result.rows[0];

      if (!site) {
        throw new Error("Le chantier n'a pas pu être créé.");
      }

      await this.insertSiteCreatorMembership(transaction, site.id, input.createdBy);

      // Journalisation atomique avec la création du chantier.
      await transaction.query(
        `
          INSERT INTO organization_audit_logs (organization_id, actor_user_id, action, metadata)
          VALUES ($1, $2, $3, $4::jsonb)
        `,
        [
          input.organizationId,
          input.createdBy,
          siteCreatedAuditAction,
          JSON.stringify({ siteName: site.name, siteId: site.id }),
        ],
      );

      return this.mapSite(site);
    });
  }

  private async insertSiteCreatorMembership(
    transaction: DatabaseExecutor,
    siteId: string,
    userId: string,
  ): Promise<void> {
    await transaction.query(
      `
        INSERT INTO site_members (site_id, user_id, role_id)
        SELECT $1, $2, roles.id
        FROM roles
        INNER JOIN user_roles ON user_roles.role_id = roles.id
        WHERE user_roles.user_id = $2
          AND roles.code = ANY($3::varchar[])
        ON CONFLICT DO NOTHING
      `,
      [siteId, userId, [...siteManagementRoleCodes]],
    );
  }

  private mapSite(row: SiteRow): SiteDetails {
    return {
      address: row.address,
      createdAt: row.created_at.toISOString(),
      createdBy: row.created_by,
      estimatedDurationDays: row.estimated_duration_days,
      id: row.id,
      name: row.name,
      organizationId: row.organization_id,
      startDate: row.start_date,
      status: row.status,
      updatedAt: row.updated_at.toISOString(),
    };
  }
}
