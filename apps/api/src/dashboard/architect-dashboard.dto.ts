import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";

import {
  architectAiAnomalySeverities,
  architectBimValidationStatuses,
  architectDataSourceStatuses,
  architectIfcFileStatuses,
} from "./architect-dashboard.types.js";

export class ArchitectDashboardQueryDto {
  @ApiPropertyOptional({
    description: "Filtre optionnel sur un chantier accessible à l'architecte.",
    example: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    type: String,
  })
  @IsOptional()
  @IsUUID("4", { message: "Le chantier doit être identifié par un UUID valide." })
  public readonly siteId?: string;
}

export class ArchitectDashboardStatsResponseDto {
  @ApiProperty({ example: 3, type: Number })
  public readonly accessibleProjectsCount!: number;

  @ApiProperty({ example: 5, type: Number })
  public readonly ifcFilesCount!: number;

  @ApiProperty({ example: 4, type: Number })
  public readonly recentAnnotationsCount!: number;

  @ApiProperty({ example: 2, type: Number })
  public readonly activeAiAnomaliesCount!: number;

  @ApiProperty({ example: 1, type: Number })
  public readonly validatedBimProjectsCount!: number;

  @ApiProperty({ example: 2, type: Number })
  public readonly bimReviewRequiredProjectsCount!: number;
}

export class ArchitectProjectResponseDto {
  @ApiProperty({ example: "f47ac10b-58cc-4372-a567-0e02b2c3d479", type: String })
  public readonly id!: string;

  @ApiProperty({ example: "Résidence Horizon", type: String })
  public readonly name!: string;

  @ApiPropertyOptional({ example: "12 rue des Artisans, Paris", nullable: true, type: String })
  public readonly address!: string | null;

  @ApiProperty({ example: "in_progress", type: String })
  public readonly status!: string;

  @ApiProperty({ example: 2, type: Number })
  public readonly ifcModelCount!: number;

  @ApiPropertyOptional({ example: "model-id", nullable: true, type: String })
  public readonly latestIfcModelId!: string | null;

  @ApiPropertyOptional({ example: "v2", nullable: true, type: String })
  public readonly latestIfcVersion!: string | null;

  @ApiPropertyOptional({ example: "file-id", nullable: true, type: String })
  public readonly latestIfcFileId!: string | null;

  @ApiPropertyOptional({ example: "residence-horizon.ifc", nullable: true, type: String })
  public readonly latestIfcFileName!: string | null;

  @ApiPropertyOptional({ example: "2026-07-03T08:30:00.000Z", nullable: true, type: String })
  public readonly latestIfcCreatedAt!: string | null;

  @ApiProperty({ enum: architectIfcFileStatuses, example: "available", type: String })
  public readonly ifcStatus!: string;

  @ApiProperty({ example: 3, type: Number })
  public readonly recentAnnotationsCount!: number;

  @ApiProperty({ example: 1, type: Number })
  public readonly activeAiAnomaliesCount!: number;

  @ApiProperty({ example: 0, type: Number })
  public readonly criticalAiAnomaliesCount!: number;

  @ApiProperty({ enum: architectBimValidationStatuses, example: "review_required", type: String })
  public readonly bimValidationStatus!: string;

  @ApiProperty({ example: "/sites/f47ac10b-58cc-4372-a567-0e02b2c3d479", type: String })
  public readonly detailsPath!: string;

  @ApiPropertyOptional({ example: "/bim/models/model-id", nullable: true, type: String })
  public readonly ifcModelPath!: string | null;
}

export class ArchitectIfcModelResponseDto {
  @ApiProperty({ example: "model-id", type: String })
  public readonly id!: string;

  @ApiProperty({ example: "site-id", type: String })
  public readonly siteId!: string;

  @ApiProperty({ example: "Résidence Horizon", type: String })
  public readonly siteName!: string;

  @ApiProperty({ example: "file-id", type: String })
  public readonly fileId!: string;

  @ApiProperty({ example: "residence-horizon.ifc", type: String })
  public readonly fileName!: string;

  @ApiProperty({ example: "v2", type: String })
  public readonly version!: string;

  @ApiPropertyOptional({ example: "Version structure validée.", nullable: true, type: String })
  public readonly notes!: string | null;

  @ApiProperty({ enum: architectIfcFileStatuses, example: "available", type: String })
  public readonly status!: string;

  @ApiProperty({ example: "2026-07-03T08:30:00.000Z", type: String })
  public readonly createdAt!: string;

  @ApiProperty({ example: "/bim/models/model-id", type: String })
  public readonly detailsPath!: string;
}

export class ArchitectAnnotationResponseDto {
  @ApiProperty({ example: "annotation-id", type: String })
  public readonly id!: string;

  @ApiProperty({ example: "site-id", type: String })
  public readonly siteId!: string;

  @ApiProperty({ example: "Résidence Horizon", type: String })
  public readonly siteName!: string;

  @ApiPropertyOptional({ example: "model-id", nullable: true, type: String })
  public readonly bimModelId!: string | null;

  @ApiProperty({ example: "Réviser cloison nord", type: String })
  public readonly title!: string;

  @ApiPropertyOptional({
    example: "Décalage constaté avec le scan terrain.",
    nullable: true,
    type: String,
  })
  public readonly comment!: string | null;

  @ApiProperty({ example: "2026-07-03T08:30:00.000Z", type: String })
  public readonly createdAt!: string;

  @ApiProperty({ example: "/bim/models/model-id/annotations/annotation-id", type: String })
  public readonly detailsPath!: string;
}

export class ArchitectAiAnomalyResponseDto {
  @ApiProperty({ example: "anomaly-id", type: String })
  public readonly id!: string;

  @ApiProperty({ example: "site-id", type: String })
  public readonly siteId!: string;

  @ApiProperty({ example: "Résidence Horizon", type: String })
  public readonly siteName!: string;

  @ApiProperty({ example: "bim_discrepancy", type: String })
  public readonly type!: string;

  @ApiProperty({ enum: architectAiAnomalySeverities, example: "high", type: String })
  public readonly severity!: string;

  @ApiProperty({ example: "Écart détecté entre IFC et scan terrain.", type: String })
  public readonly description!: string;

  @ApiPropertyOptional({
    example: "Contrôler la zone dans la maquette BIM.",
    nullable: true,
    type: String,
  })
  public readonly recommendation!: string | null;

  @ApiProperty({ example: "open", type: String })
  public readonly status!: string;

  @ApiProperty({ example: "2026-07-03T08:30:00.000Z", type: String })
  public readonly detectedAt!: string;

  @ApiProperty({ example: "/sites/site-id/alerts/anomaly-id", type: String })
  public readonly detailsPath!: string;
}

export class ArchitectNavigationShortcutResponseDto {
  @ApiProperty({ example: "Ouvrir IFC Résidence Horizon", type: String })
  public readonly label!: string;

  @ApiProperty({ example: "Accéder au modèle IFC le plus récent.", type: String })
  public readonly description!: string;

  @ApiProperty({ example: "/bim/models/model-id", type: String })
  public readonly path!: string;

  @ApiPropertyOptional({ example: "model-id", nullable: true, type: String })
  public readonly modelId!: string | null;

  @ApiPropertyOptional({ example: "site-id", nullable: true, type: String })
  public readonly siteId!: string | null;

  @ApiProperty({ example: "ifc_model_details", type: String })
  public readonly type!: string;
}

export class ArchitectDataSourceResponseDto {
  @ApiProperty({ example: "bim_models", type: String })
  public readonly key!: string;

  @ApiProperty({ example: "Modèles IFC", type: String })
  public readonly label!: string;

  @ApiProperty({ enum: architectDataSourceStatuses, example: "available", type: String })
  public readonly status!: string;

  @ApiProperty({ example: "Données calculées depuis les modèles BIM persistés.", type: String })
  public readonly message!: string;
}

export class ArchitectDashboardEmptyStateResponseDto {
  @ApiProperty({ example: "Aucun projet architecte accessible", type: String })
  public readonly title!: string;

  @ApiProperty({
    example: "Aucun chantier n'est associé à votre rôle architecte pour le moment.",
    type: String,
  })
  public readonly message!: string;
}

export class ArchitectDashboardResponseDto {
  @ApiProperty({ example: "0b7fd7c8-f6ea-4011-a87d-589d2f3fba4e", type: String })
  public readonly organizationId!: string;

  @ApiPropertyOptional({ example: "site-id", nullable: true, type: String })
  public readonly siteId!: string | null;

  @ApiProperty({ example: "2026-07-03T08:30:00.000Z", type: String })
  public readonly generatedAt!: string;

  @ApiProperty({ example: "http_polling", type: String })
  public readonly refreshMode!: string;

  @ApiProperty({ example: 30, type: Number })
  public readonly refreshIntervalSeconds!: number;

  @ApiProperty({ example: false, type: Boolean })
  public readonly realTimeAvailable!: boolean;

  @ApiProperty({ type: ArchitectDashboardStatsResponseDto })
  public readonly stats!: ArchitectDashboardStatsResponseDto;

  @ApiProperty({ isArray: true, type: ArchitectProjectResponseDto })
  public readonly projects!: readonly ArchitectProjectResponseDto[];

  @ApiProperty({ isArray: true, type: ArchitectIfcModelResponseDto })
  public readonly ifcModels!: readonly ArchitectIfcModelResponseDto[];

  @ApiProperty({ isArray: true, type: ArchitectAnnotationResponseDto })
  public readonly annotations!: readonly ArchitectAnnotationResponseDto[];

  @ApiProperty({ isArray: true, type: ArchitectAiAnomalyResponseDto })
  public readonly aiAnomalies!: readonly ArchitectAiAnomalyResponseDto[];

  @ApiProperty({ isArray: true, type: ArchitectNavigationShortcutResponseDto })
  public readonly navigationShortcuts!: readonly ArchitectNavigationShortcutResponseDto[];

  @ApiProperty({ isArray: true, type: ArchitectDataSourceResponseDto })
  public readonly dataSources!: readonly ArchitectDataSourceResponseDto[];

  @ApiPropertyOptional({ nullable: true, type: ArchitectDashboardEmptyStateResponseDto })
  public readonly emptyState!: ArchitectDashboardEmptyStateResponseDto | null;
}
