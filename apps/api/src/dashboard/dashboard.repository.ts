import { Inject, Injectable } from "@nestjs/common";
import type { QueryResultRow } from "pg";

import { DatabaseService } from "../database/database.service.js";
import type { JsonObject } from "../database/database.types.js";
import {
  siteManagerAlertsQuery,
  siteManagerDeadlinesQuery,
  siteManagerSiteSummariesQuery,
} from "./dashboard.queries.js";
import type {
  DashboardAlertSeverity,
  DashboardAlertSummary,
  DashboardDeadlineKind,
  DashboardDeadlineSummary,
  DashboardRepositoryPort,
  DashboardSiteSummary,
  SiteManagerDashboardAuditInput,
  SiteManagerDashboardQuery,
} from "./dashboard.types.js";
import {
  siteManagerDashboardRoleCodes,
  siteManagerDashboardViewedAuditAction,
} from "./dashboard.types.js";

interface SiteSummaryRow extends QueryResultRow {
  readonly id: string;
  readonly name: string;
  readonly address: string | null;
  readonly status: string;
  readonly progress_percent: string;
  readonly task_total_count: number;
  readonly task_in_progress_count: number;
  readonly task_completed_count: number;
  readonly active_workers_count: number;
  readonly active_alerts_count: number;
  readonly critical_alerts_count: number;
  readonly next_deadline_at: string | null;
}

interface AlertSummaryRow extends QueryResultRow {
  readonly id: string;
  readonly site_id: string;
  readonly site_name: string;
  readonly type: string;
  readonly severity: DashboardAlertSeverity;
  readonly description: string;
  readonly recommendation: string | null;
  readonly status: string;
  readonly detected_at: Date;
}

interface DeadlineSummaryRow extends QueryResultRow {
  readonly id: string;
  readonly site_id: string;
  readonly site_name: string;
  readonly kind: DashboardDeadlineKind;
  readonly label: string;
  readonly status: string;
  readonly due_date: string;
}

type DashboardQueryValues = readonly [string, string, string | null, string[]];

@Injectable()
export class DashboardRepository implements DashboardRepositoryPort {
  public constructor(@Inject(DatabaseService) private readonly databaseService: DatabaseService) {}

  public async listSiteManagerSiteSummaries(
    query: SiteManagerDashboardQuery,
  ): Promise<readonly DashboardSiteSummary[]> {
    const result = await this.databaseService.query<SiteSummaryRow>(
      siteManagerSiteSummariesQuery,
      this.createDashboardQueryValues(query),
    );

    return result.rows.map((row) => this.mapSiteSummary(row));
  }

  public async listSiteManagerAlerts(
    query: SiteManagerDashboardQuery,
  ): Promise<readonly DashboardAlertSummary[]> {
    const result = await this.databaseService.query<AlertSummaryRow>(
      siteManagerAlertsQuery,
      this.createDashboardQueryValues(query),
    );

    return result.rows.map((row) => this.mapAlertSummary(row));
  }

  public async listSiteManagerDeadlines(
    query: SiteManagerDashboardQuery,
  ): Promise<readonly DashboardDeadlineSummary[]> {
    const result = await this.databaseService.query<DeadlineSummaryRow>(
      siteManagerDeadlinesQuery,
      this.createDashboardQueryValues(query),
    );

    return result.rows.map((row) => this.mapDeadlineSummary(row));
  }

  public async recordSiteManagerDashboardAccess(
    input: SiteManagerDashboardAuditInput,
  ): Promise<void> {
    const metadata = this.createDashboardAuditMetadata(input);

    await this.databaseService.query(
      `
        INSERT INTO organization_audit_logs (organization_id, actor_user_id, action, metadata)
        VALUES ($1, $2, $3, $4::jsonb)
      `,
      [
        input.organizationId,
        input.actorUserId,
        siteManagerDashboardViewedAuditAction,
        JSON.stringify(metadata),
      ],
    );
  }

  private createDashboardAuditMetadata(input: SiteManagerDashboardAuditInput): JsonObject {
    const commonMetadata: JsonObject = {
      dashboard: "site_manager",
      siteFilterApplied: input.siteId !== null,
      upcomingDeadlineCount: input.upcomingDeadlineCount,
      visibleAlertCount: input.visibleAlertCount,
      visibleSiteCount: input.visibleSiteCount,
    };

    if (!input.siteId) {
      return commonMetadata;
    }

    return { ...commonMetadata, siteId: input.siteId };
  }

  public async siteExistsInOrganization(siteId: string, organizationId: string): Promise<boolean> {
    const result = await this.databaseService.query<{ readonly id: string }>(
      `SELECT id FROM sites WHERE id = $1 AND organization_id = $2`,
      [siteId, organizationId],
    );

    return result.rows.length > 0;
  }

  public async userCanAccessSiteManagerDashboard(
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

  private createDashboardQueryValues(query: SiteManagerDashboardQuery): DashboardQueryValues {
    const roleCodes = [...siteManagerDashboardRoleCodes];

    return [query.organizationId, query.userId, query.siteId, roleCodes];
  }

  private mapSiteSummary(row: SiteSummaryRow): DashboardSiteSummary {
    return {
      activeAlertsCount: row.active_alerts_count,
      activeWorkersCount: row.active_workers_count,
      address: row.address,
      criticalAlertsCount: row.critical_alerts_count,
      detailsPath: this.createSiteDetailsPath(row.id),
      id: row.id,
      name: row.name,
      nextDeadlineAt: row.next_deadline_at,
      progressPercent: Number(row.progress_percent),
      status: row.status,
      taskCompletedCount: row.task_completed_count,
      taskInProgressCount: row.task_in_progress_count,
      taskTotalCount: row.task_total_count,
    };
  }

  private mapAlertSummary(row: AlertSummaryRow): DashboardAlertSummary {
    return {
      description: row.description,
      detectedAt: row.detected_at.toISOString(),
      detailsPath: this.createSiteDetailsPath(row.site_id),
      id: row.id,
      recommendation: row.recommendation,
      severity: row.severity,
      siteId: row.site_id,
      siteName: row.site_name,
      status: row.status,
      type: row.type,
    };
  }

  private mapDeadlineSummary(row: DeadlineSummaryRow): DashboardDeadlineSummary {
    return {
      detailsPath: this.createSiteDetailsPath(row.site_id),
      dueDate: row.due_date,
      id: row.id,
      kind: row.kind,
      label: row.label,
      siteId: row.site_id,
      siteName: row.site_name,
      status: row.status,
    };
  }

  private createSiteDetailsPath(siteId: string): string {
    return `/sites/${siteId}`;
  }
}
