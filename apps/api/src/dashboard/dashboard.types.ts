export const siteManagerDashboardRoleCodes = ["chef_chantier", "administrateur"] as const;
export const siteManagerDashboardViewedAuditAction = "dashboard.site_manager_viewed";

export const dashboardAlertSeverities = ["low", "medium", "high", "critical"] as const;
export type DashboardAlertSeverity = (typeof dashboardAlertSeverities)[number];

export const dashboardDeadlineKinds = ["site", "phase", "task"] as const;
export type DashboardDeadlineKind = (typeof dashboardDeadlineKinds)[number];

export const dashboardDataSourceStatuses = ["available", "empty", "unavailable"] as const;
export type DashboardDataSourceStatus = (typeof dashboardDataSourceStatuses)[number];

export interface SiteManagerDashboardQuery {
  readonly organizationId: string;
  readonly siteId: string | null;
  readonly userId: string;
}

export interface SiteManagerDashboardAuditInput {
  readonly actorUserId: string;
  readonly organizationId: string;
  readonly siteId: string | null;
  readonly upcomingDeadlineCount: number;
  readonly visibleAlertCount: number;
  readonly visibleSiteCount: number;
}

export interface DashboardSiteSummary {
  readonly id: string;
  readonly name: string;
  readonly address: string | null;
  readonly status: string;
  readonly progressPercent: number;
  readonly taskTotalCount: number;
  readonly taskInProgressCount: number;
  readonly taskCompletedCount: number;
  readonly activeWorkersCount: number;
  readonly activeAlertsCount: number;
  readonly criticalAlertsCount: number;
  readonly nextDeadlineAt: string | null;
  readonly detailsPath: string;
}

export interface DashboardAlertSummary {
  readonly id: string;
  readonly siteId: string;
  readonly siteName: string;
  readonly type: string;
  readonly severity: DashboardAlertSeverity;
  readonly description: string;
  readonly recommendation: string | null;
  readonly status: string;
  readonly detectedAt: string;
  readonly detailsPath: string;
}

export interface DashboardDeadlineSummary {
  readonly id: string;
  readonly siteId: string;
  readonly siteName: string;
  readonly kind: DashboardDeadlineKind;
  readonly label: string;
  readonly status: string;
  readonly dueDate: string;
  readonly detailsPath: string;
}

export interface DashboardNavigationShortcut {
  readonly label: string;
  readonly description: string;
  readonly path: string;
  readonly siteId: string | null;
  readonly type: string;
}

export interface DashboardDataSource {
  readonly key: string;
  readonly label: string;
  readonly status: DashboardDataSourceStatus;
  readonly message: string;
}

export interface DashboardEmptyState {
  readonly title: string;
  readonly message: string;
}

export interface SiteManagerDashboardDetails {
  readonly organizationId: string;
  readonly siteId: string | null;
  readonly generatedAt: string;
  readonly refreshMode: "http_polling";
  readonly refreshIntervalSeconds: number;
  readonly realTimeAvailable: boolean;
  readonly stats: SiteManagerDashboardStats;
  readonly sites: readonly DashboardSiteSummary[];
  readonly alerts: readonly DashboardAlertSummary[];
  readonly upcomingDeadlines: readonly DashboardDeadlineSummary[];
  readonly navigationShortcuts: readonly DashboardNavigationShortcut[];
  readonly dataSources: readonly DashboardDataSource[];
  readonly emptyState: DashboardEmptyState | null;
}

export interface SiteManagerDashboardStats {
  readonly accessibleSitesCount: number;
  readonly activeSitesCount: number;
  readonly globalProgressPercent: number;
  readonly taskInProgressCount: number;
  readonly taskCompletedCount: number;
  readonly activeWorkersCount: number;
  readonly activeAlertsCount: number;
  readonly criticalAlertsCount: number;
  readonly upcomingDeadlinesCount: number;
}

export interface DashboardRepositoryPort {
  listSiteManagerSiteSummaries(
    query: SiteManagerDashboardQuery,
  ): Promise<readonly DashboardSiteSummary[]>;
  listSiteManagerAlerts(
    query: SiteManagerDashboardQuery,
  ): Promise<readonly DashboardAlertSummary[]>;
  listSiteManagerDeadlines(
    query: SiteManagerDashboardQuery,
  ): Promise<readonly DashboardDeadlineSummary[]>;
  recordSiteManagerDashboardAccess(input: SiteManagerDashboardAuditInput): Promise<void>;
  siteExistsInOrganization(siteId: string, organizationId: string): Promise<boolean>;
  userCanAccessSiteManagerDashboard(
    siteId: string,
    userId: string,
    roleCodes: readonly string[],
  ): Promise<boolean>;
}
