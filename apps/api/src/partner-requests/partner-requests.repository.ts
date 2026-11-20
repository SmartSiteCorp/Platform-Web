import { Inject, Injectable } from "@nestjs/common";
import type { QueryResultRow } from "pg";

import { DatabaseService } from "../database/database.service.js";
import type {
  ListPartnerRequestsFilters,
  ListPartnerRequestsResult,
  PartnerRequestDetails,
  PartnerRequestsRepositoryPort,
  PartnerType,
} from "./partner-requests.types.js";

interface PartnerRequestRow extends QueryResultRow {
  readonly id: string;
  readonly partner_type: PartnerType;
  readonly site_id: string;
  readonly site_name: string;
  readonly mission_description: string | null;
  readonly requested_date: string | null;
  readonly status: string;
  readonly created_at: Date;
  readonly updated_at: Date;
}

@Injectable()
export class PartnerRequestsRepository implements PartnerRequestsRepositoryPort {
  public constructor(@Inject(DatabaseService) private readonly databaseService: DatabaseService) {}

  public async siteExistsInOrganization(siteId: string, organizationId: string): Promise<boolean> {
    const result = await this.databaseService.query<{ readonly id: string }>(
      `SELECT id FROM sites WHERE id = $1 AND organization_id = $2`,
      [siteId, organizationId],
    );

    return result.rows.length > 0;
  }

  public async userCanAccessSite(
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

  public async listPartnerRequests(
    filters: ListPartnerRequestsFilters,
  ): Promise<ListPartnerRequestsResult> {
    const commonParams: readonly (string | string[] | null)[] = [
      filters.organizationId,
      filters.userId,
      [...filters.roleCodes],
      filters.partnerType,
      filters.siteId,
    ];

    const countResult = await this.databaseService.query<{ readonly total: string }>(
      `${this.buildUnionQuery()} SELECT count(*)::text AS total FROM combined_requests`,
      [...commonParams],
    );

    const rowsResult = await this.databaseService.query<PartnerRequestRow>(
      `
        ${this.buildUnionQuery()}
        SELECT * FROM combined_requests
        ORDER BY created_at DESC
        LIMIT $6 OFFSET $7
      `,
      [...commonParams, filters.limit, filters.offset],
    );

    return {
      items: rowsResult.rows.map((row) => this.mapPartnerRequest(row)),
      total: Number(countResult.rows[0]?.total ?? 0),
    };
  }

  private buildUnionQuery(): string {
    return `
      WITH accessible_sites AS (
        SELECT DISTINCT site_members.site_id
        FROM site_members
        INNER JOIN roles ON roles.id = site_members.role_id
        WHERE site_members.user_id = $2 AND roles.code = ANY($3::varchar[])
      ),
      combined_requests AS (
        SELECT
          architect_requests.id,
          'architect'::text AS partner_type,
          architect_requests.site_id,
          sites.name AS site_name,
          architect_requests.mission_description,
          architect_requests.requested_date::text AS requested_date,
          architect_requests.status::text AS status,
          architect_requests.created_at,
          architect_requests.updated_at
        FROM architect_requests
        INNER JOIN sites ON sites.id = architect_requests.site_id
        WHERE architect_requests.organization_id = $1
          AND architect_requests.site_id IN (SELECT site_id FROM accessible_sites)
          AND ($4::text IS NULL OR $4::text = 'architect')
          AND ($5::uuid IS NULL OR architect_requests.site_id = $5::uuid)

        UNION ALL

        SELECT
          drone_requests.id,
          'drone'::text AS partner_type,
          drone_requests.site_id,
          sites.name AS site_name,
          drone_requests.mission_description,
          drone_requests.requested_date::text AS requested_date,
          drone_requests.status::text AS status,
          drone_requests.created_at,
          drone_requests.updated_at
        FROM drone_requests
        INNER JOIN sites ON sites.id = drone_requests.site_id
        WHERE drone_requests.organization_id = $1
          AND drone_requests.site_id IN (SELECT site_id FROM accessible_sites)
          AND ($4::text IS NULL OR $4::text = 'drone')
          AND ($5::uuid IS NULL OR drone_requests.site_id = $5::uuid)
      )
    `;
  }

  private mapPartnerRequest(row: PartnerRequestRow): PartnerRequestDetails {
    return {
      createdAt: row.created_at.toISOString(),
      id: row.id,
      missionDescription: row.mission_description,
      partnerType: row.partner_type,
      requestedDate: row.requested_date,
      siteId: row.site_id,
      siteName: row.site_name,
      status: row.status,
      updatedAt: row.updated_at.toISOString(),
    };
  }
}
