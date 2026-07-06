export const architectDashboardRoleCodes = ["architecte", "administrateur"] as const;
export const architectDashboardViewedAuditAction = "dashboard.architect_viewed";

export const architectIfcFileStatuses = ["available", "processing", "invalid", "missing"] as const;
export type ArchitectIfcFileStatus = (typeof architectIfcFileStatuses)[number];

export const architectBimValidationStatuses = [
  "pending",
  "validated",
  "review_required",
  "blocked",
] as const;
export type ArchitectBimValidationStatus = (typeof architectBimValidationStatuses)[number];

export const architectAiAnomalySeverities = ["low", "medium", "high", "critical"] as const;
export type ArchitectAiAnomalySeverity = (typeof architectAiAnomalySeverities)[number];

export const architectDataSourceStatuses = ["available", "empty", "unavailable"] as const;
export type ArchitectDataSourceStatus = (typeof architectDataSourceStatuses)[number];

export interface ArchitectDashboardQuery {
  readonly organizationId: string;
  readonly siteId: string | null;
  readonly userId: string;
}

export interface ArchitectDashboardAuditInput {
  readonly actorUserId: string;
  readonly organizationId: string;
  readonly siteId: string | null;
  readonly visibleAiAnomalyCount: number;
  readonly visibleIfcModelCount: number;
  readonly visibleProjectCount: number;
}

export interface ArchitectProjectSummary {
  readonly id: string;
  readonly name: string;
  readonly address: string | null;
  readonly status: string;
  readonly ifcModelCount: number;
  readonly latestIfcModelId: string | null;
  readonly latestIfcVersion: string | null;
  readonly latestIfcFileId: string | null;
  readonly latestIfcFileName: string | null;
  readonly latestIfcCreatedAt: string | null;
  readonly ifcStatus: ArchitectIfcFileStatus;
  readonly recentAnnotationsCount: number;
  readonly activeAiAnomaliesCount: number;
  readonly criticalAiAnomaliesCount: number;
  readonly bimValidationStatus: ArchitectBimValidationStatus;
  readonly detailsPath: string;
  readonly ifcModelPath: string | null;
}

export interface ArchitectIfcModelSummary {
  readonly id: string;
  readonly siteId: string;
  readonly siteName: string;
  readonly fileId: string;
  readonly fileName: string;
  readonly version: string;
  readonly notes: string | null;
  readonly status: ArchitectIfcFileStatus;
  readonly createdAt: string;
  readonly detailsPath: string;
}

export interface ArchitectAnnotationSummary {
  readonly id: string;
  readonly siteId: string;
  readonly siteName: string;
  readonly bimModelId: string | null;
  readonly title: string;
  readonly comment: string | null;
  readonly createdAt: string;
  readonly detailsPath: string;
}

export interface ArchitectAiAnomalySummary {
  readonly id: string;
  readonly siteId: string;
  readonly siteName: string;
  readonly type: string;
  readonly severity: ArchitectAiAnomalySeverity;
  readonly description: string;
  readonly recommendation: string | null;
  readonly status: string;
  readonly detectedAt: string;
  readonly detailsPath: string;
}

export interface ArchitectDashboardStats {
  readonly accessibleProjectsCount: number;
  readonly ifcFilesCount: number;
  readonly recentAnnotationsCount: number;
  readonly activeAiAnomaliesCount: number;
  readonly validatedBimProjectsCount: number;
  readonly bimReviewRequiredProjectsCount: number;
}

export interface ArchitectNavigationShortcut {
  readonly label: string;
  readonly description: string;
  readonly path: string;
  readonly modelId: string | null;
  readonly siteId: string | null;
  readonly type: string;
}

export interface ArchitectDataSource {
  readonly key: string;
  readonly label: string;
  readonly status: ArchitectDataSourceStatus;
  readonly message: string;
}

export interface ArchitectDashboardEmptyState {
  readonly title: string;
  readonly message: string;
}

export interface ArchitectDashboardDetails {
  readonly organizationId: string;
  readonly siteId: string | null;
  readonly generatedAt: string;
  readonly refreshMode: "http_polling";
  readonly refreshIntervalSeconds: number;
  readonly realTimeAvailable: boolean;
  readonly stats: ArchitectDashboardStats;
  readonly projects: readonly ArchitectProjectSummary[];
  readonly ifcModels: readonly ArchitectIfcModelSummary[];
  readonly annotations: readonly ArchitectAnnotationSummary[];
  readonly aiAnomalies: readonly ArchitectAiAnomalySummary[];
  readonly navigationShortcuts: readonly ArchitectNavigationShortcut[];
  readonly dataSources: readonly ArchitectDataSource[];
  readonly emptyState: ArchitectDashboardEmptyState | null;
}

export interface ArchitectDashboardRepositoryPort {
  listArchitectAiAnomalies(
    query: ArchitectDashboardQuery,
  ): Promise<readonly ArchitectAiAnomalySummary[]>;
  listArchitectAnnotations(
    query: ArchitectDashboardQuery,
  ): Promise<readonly ArchitectAnnotationSummary[]>;
  listArchitectIfcModels(
    query: ArchitectDashboardQuery,
  ): Promise<readonly ArchitectIfcModelSummary[]>;
  listArchitectProjects(
    query: ArchitectDashboardQuery,
  ): Promise<readonly ArchitectProjectSummary[]>;
  recordArchitectDashboardAccess(input: ArchitectDashboardAuditInput): Promise<void>;
  siteExistsInOrganization(siteId: string, organizationId: string): Promise<boolean>;
  userCanAccessArchitectDashboard(
    siteId: string,
    userId: string,
    roleCodes: readonly string[],
  ): Promise<boolean>;
}
