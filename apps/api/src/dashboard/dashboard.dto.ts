import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";

import {
  dashboardAlertSeverities,
  dashboardDataSourceStatuses,
  dashboardDeadlineKinds,
} from "./dashboard.types.js";

export class SiteManagerDashboardQueryDto {
  @ApiPropertyOptional({
    description: "Filtre optionnel sur un chantier accessible au chef de chantier.",
    example: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    type: String,
  })
  @IsOptional()
  @IsUUID("4", { message: "Le chantier doit être identifié par un UUID valide." })
  public readonly siteId?: string;
}

export class SiteManagerDashboardStatsResponseDto {
  @ApiProperty({ example: 3, type: Number })
  public readonly accessibleSitesCount!: number;

  @ApiProperty({ example: 2, type: Number })
  public readonly activeSitesCount!: number;

  @ApiProperty({ example: 68, type: Number })
  public readonly globalProgressPercent!: number;

  @ApiProperty({ example: 7, type: Number })
  public readonly taskInProgressCount!: number;

  @ApiProperty({ example: 18, type: Number })
  public readonly taskCompletedCount!: number;

  @ApiProperty({ example: 12, type: Number })
  public readonly activeWorkersCount!: number;

  @ApiProperty({ example: 4, type: Number })
  public readonly activeAlertsCount!: number;

  @ApiProperty({ example: 1, type: Number })
  public readonly criticalAlertsCount!: number;

  @ApiProperty({ example: 5, type: Number })
  public readonly upcomingDeadlinesCount!: number;
}

export class SiteManagerDashboardSiteResponseDto {
  @ApiProperty({ example: "f47ac10b-58cc-4372-a567-0e02b2c3d479", type: String })
  public readonly id!: string;

  @ApiProperty({ example: "Résidence Horizon", type: String })
  public readonly name!: string;

  @ApiPropertyOptional({ example: "12 rue des Artisans, Paris", nullable: true, type: String })
  public readonly address!: string | null;

  @ApiProperty({ example: "in_progress", type: String })
  public readonly status!: string;

  @ApiProperty({ example: 68, type: Number })
  public readonly progressPercent!: number;

  @ApiProperty({ example: 20, type: Number })
  public readonly taskTotalCount!: number;

  @ApiProperty({ example: 7, type: Number })
  public readonly taskInProgressCount!: number;

  @ApiProperty({ example: 12, type: Number })
  public readonly taskCompletedCount!: number;

  @ApiProperty({ example: 8, type: Number })
  public readonly activeWorkersCount!: number;

  @ApiProperty({ example: 2, type: Number })
  public readonly activeAlertsCount!: number;

  @ApiProperty({ example: 1, type: Number })
  public readonly criticalAlertsCount!: number;

  @ApiPropertyOptional({ example: "2026-07-15", nullable: true, type: String })
  public readonly nextDeadlineAt!: string | null;

  @ApiProperty({ example: "/sites/f47ac10b-58cc-4372-a567-0e02b2c3d479", type: String })
  public readonly detailsPath!: string;
}

export class SiteManagerDashboardAlertResponseDto {
  @ApiProperty({ example: "f47ac10b-58cc-4372-a567-0e02b2c3d479", type: String })
  public readonly id!: string;

  @ApiProperty({ example: "30eb69f8-82cd-4b04-8d88-8a2f64b8d6d8", type: String })
  public readonly siteId!: string;

  @ApiProperty({ example: "Résidence Horizon", type: String })
  public readonly siteName!: string;

  @ApiProperty({ example: "delay_risk", type: String })
  public readonly type!: string;

  @ApiProperty({ enum: dashboardAlertSeverities, example: "high", type: String })
  public readonly severity!: string;

  @ApiProperty({ example: "Retard probable sur le gros œuvre.", type: String })
  public readonly description!: string;

  @ApiPropertyOptional({
    example: "Réaffecter deux ouvriers sur la phase concernée.",
    nullable: true,
    type: String,
  })
  public readonly recommendation!: string | null;

  @ApiProperty({ example: "open", type: String })
  public readonly status!: string;

  @ApiProperty({ example: "2026-07-03T08:30:00.000Z", type: String })
  public readonly detectedAt!: string;

  @ApiProperty({ example: "/sites/30eb69f8-82cd-4b04-8d88-8a2f64b8d6d8", type: String })
  public readonly detailsPath!: string;
}

export class SiteManagerDashboardDeadlineResponseDto {
  @ApiProperty({ example: "f47ac10b-58cc-4372-a567-0e02b2c3d479", type: String })
  public readonly id!: string;

  @ApiProperty({ example: "30eb69f8-82cd-4b04-8d88-8a2f64b8d6d8", type: String })
  public readonly siteId!: string;

  @ApiProperty({ example: "Résidence Horizon", type: String })
  public readonly siteName!: string;

  @ApiProperty({ enum: dashboardDeadlineKinds, example: "task", type: String })
  public readonly kind!: string;

  @ApiProperty({ example: "Validation isolation mur nord", type: String })
  public readonly label!: string;

  @ApiProperty({ example: "in_progress", type: String })
  public readonly status!: string;

  @ApiProperty({ example: "2026-07-15", type: String })
  public readonly dueDate!: string;

  @ApiProperty({ example: "/sites/30eb69f8-82cd-4b04-8d88-8a2f64b8d6d8", type: String })
  public readonly detailsPath!: string;
}

export class SiteManagerDashboardNavigationShortcutResponseDto {
  @ApiProperty({ example: "Ouvrir Résidence Horizon", type: String })
  public readonly label!: string;

  @ApiProperty({ example: "Accéder au détail du chantier.", type: String })
  public readonly description!: string;

  @ApiProperty({ example: "/sites/30eb69f8-82cd-4b04-8d88-8a2f64b8d6d8", type: String })
  public readonly path!: string;

  @ApiPropertyOptional({
    example: "30eb69f8-82cd-4b04-8d88-8a2f64b8d6d8",
    nullable: true,
    type: String,
  })
  public readonly siteId!: string | null;

  @ApiProperty({ example: "site_details", type: String })
  public readonly type!: string;
}

export class SiteManagerDashboardDataSourceResponseDto {
  @ApiProperty({ example: "planning", type: String })
  public readonly key!: string;

  @ApiProperty({ example: "Planning chantier", type: String })
  public readonly label!: string;

  @ApiProperty({ enum: dashboardDataSourceStatuses, example: "available", type: String })
  public readonly status!: string;

  @ApiProperty({ example: "Données calculées depuis les phases et tâches.", type: String })
  public readonly message!: string;
}

export class SiteManagerDashboardEmptyStateResponseDto {
  @ApiProperty({ example: "Aucun chantier accessible", type: String })
  public readonly title!: string;

  @ApiProperty({
    example: "Aucun chantier n'est associé à votre compte pour le moment.",
    type: String,
  })
  public readonly message!: string;
}

export class SiteManagerDashboardResponseDto {
  @ApiProperty({ example: "0b7fd7c8-f6ea-4011-a87d-589d2f3fba4e", type: String })
  public readonly organizationId!: string;

  @ApiPropertyOptional({
    example: "30eb69f8-82cd-4b04-8d88-8a2f64b8d6d8",
    nullable: true,
    type: String,
  })
  public readonly siteId!: string | null;

  @ApiProperty({ example: "2026-07-03T08:30:00.000Z", type: String })
  public readonly generatedAt!: string;

  @ApiProperty({ example: "http_polling", type: String })
  public readonly refreshMode!: string;

  @ApiProperty({ example: 30, type: Number })
  public readonly refreshIntervalSeconds!: number;

  @ApiProperty({ example: false, type: Boolean })
  public readonly realTimeAvailable!: boolean;

  @ApiProperty({ type: SiteManagerDashboardStatsResponseDto })
  public readonly stats!: SiteManagerDashboardStatsResponseDto;

  @ApiProperty({ isArray: true, type: SiteManagerDashboardSiteResponseDto })
  public readonly sites!: readonly SiteManagerDashboardSiteResponseDto[];

  @ApiProperty({ isArray: true, type: SiteManagerDashboardAlertResponseDto })
  public readonly alerts!: readonly SiteManagerDashboardAlertResponseDto[];

  @ApiProperty({ isArray: true, type: SiteManagerDashboardDeadlineResponseDto })
  public readonly upcomingDeadlines!: readonly SiteManagerDashboardDeadlineResponseDto[];

  @ApiProperty({ isArray: true, type: SiteManagerDashboardNavigationShortcutResponseDto })
  public readonly navigationShortcuts!: readonly SiteManagerDashboardNavigationShortcutResponseDto[];

  @ApiProperty({ isArray: true, type: SiteManagerDashboardDataSourceResponseDto })
  public readonly dataSources!: readonly SiteManagerDashboardDataSourceResponseDto[];

  @ApiPropertyOptional({
    nullable: true,
    type: SiteManagerDashboardEmptyStateResponseDto,
  })
  public readonly emptyState!: SiteManagerDashboardEmptyStateResponseDto | null;
}
