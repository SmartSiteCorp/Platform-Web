import { Inject, Injectable } from "@nestjs/common";

import { DatabaseService } from "../database/database.service.js";
import type { JsonObject } from "../database/database.types.js";
import {
  architectAiAnomaliesQuery,
  architectAnnotationsQuery,
  architectIfcModelsQuery,
  architectProjectSummariesQuery,
} from "./architect-dashboard.queries.js";
import {
  mapArchitectAiAnomalySummary,
  mapArchitectAnnotationSummary,
  mapArchitectIfcModelSummary,
  mapArchitectProjectSummary,
  type ArchitectAiAnomalyRow,
  type ArchitectAnnotationRow,
  type ArchitectIfcModelRow,
  type ArchitectProjectRow,
} from "./architect-dashboard.repository-mappers.js";
import {
  architectDashboardRoleCodes,
  architectDashboardViewedAuditAction,
  type ArchitectAiAnomalySummary,
  type ArchitectAnnotationSummary,
  type ArchitectDashboardAuditInput,
  type ArchitectDashboardQuery,
  type ArchitectDashboardRepositoryPort,
  type ArchitectIfcModelSummary,
  type ArchitectProjectSummary,
} from "./architect-dashboard.types.js";

type ArchitectDashboardQueryValues = readonly [string, string, string | null, string[]];

@Injectable()
export class ArchitectDashboardRepository implements ArchitectDashboardRepositoryPort {
  public constructor(@Inject(DatabaseService) private readonly databaseService: DatabaseService) {}

  public async listArchitectProjects(
    query: ArchitectDashboardQuery,
  ): Promise<readonly ArchitectProjectSummary[]> {
    const result = await this.databaseService.query<ArchitectProjectRow>(
      architectProjectSummariesQuery,
      this.createDashboardQueryValues(query),
    );

    return result.rows.map(mapArchitectProjectSummary);
  }

  public async listArchitectIfcModels(
    query: ArchitectDashboardQuery,
  ): Promise<readonly ArchitectIfcModelSummary[]> {
    const result = await this.databaseService.query<ArchitectIfcModelRow>(
      architectIfcModelsQuery,
      this.createDashboardQueryValues(query),
    );

    return result.rows.map(mapArchitectIfcModelSummary);
  }

  public async listArchitectAnnotations(
    query: ArchitectDashboardQuery,
  ): Promise<readonly ArchitectAnnotationSummary[]> {
    const result = await this.databaseService.query<ArchitectAnnotationRow>(
      architectAnnotationsQuery,
      this.createDashboardQueryValues(query),
    );

    return result.rows.map(mapArchitectAnnotationSummary);
  }

  public async listArchitectAiAnomalies(
    query: ArchitectDashboardQuery,
  ): Promise<readonly ArchitectAiAnomalySummary[]> {
    const result = await this.databaseService.query<ArchitectAiAnomalyRow>(
      architectAiAnomaliesQuery,
      this.createDashboardQueryValues(query),
    );

    return result.rows.map(mapArchitectAiAnomalySummary);
  }

  public async recordArchitectDashboardAccess(input: ArchitectDashboardAuditInput): Promise<void> {
    const metadata = this.createDashboardAuditMetadata(input);

    await this.databaseService.query(
      `
        INSERT INTO organization_audit_logs (organization_id, actor_user_id, action, metadata)
        VALUES ($1, $2, $3, $4::jsonb)
      `,
      [
        input.organizationId,
        input.actorUserId,
        architectDashboardViewedAuditAction,
        JSON.stringify(metadata),
      ],
    );
  }

  public async siteExistsInOrganization(siteId: string, organizationId: string): Promise<boolean> {
    const result = await this.databaseService.query<{ readonly id: string }>(
      `SELECT id FROM sites WHERE id = $1 AND organization_id = $2`,
      [siteId, organizationId],
    );

    return result.rows.length > 0;
  }

  public async userCanAccessArchitectDashboard(
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

  private createDashboardQueryValues(
    query: ArchitectDashboardQuery,
  ): ArchitectDashboardQueryValues {
    return [query.organizationId, query.userId, query.siteId, [...architectDashboardRoleCodes]];
  }

  private createDashboardAuditMetadata(input: ArchitectDashboardAuditInput): JsonObject {
    const commonMetadata: JsonObject = {
      dashboard: "architect",
      siteFilterApplied: input.siteId !== null,
      visibleAiAnomalyCount: input.visibleAiAnomalyCount,
      visibleIfcModelCount: input.visibleIfcModelCount,
      visibleProjectCount: input.visibleProjectCount,
    };

    if (!input.siteId) {
      return commonMetadata;
    }

    return { ...commonMetadata, siteId: input.siteId };
  }
}
