import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import type { AccessTokenPayload } from "../auth/auth.types.js";
import { OrganizationsService } from "../organizations/organizations.service.js";
import type { SiteManagerDashboardQueryDto } from "./dashboard.dto.js";
import { DashboardRepository } from "./dashboard.repository.js";
import {
  siteManagerDashboardRoleCodes,
  type DashboardDataSource,
  type DashboardDataSourceStatus,
  type DashboardNavigationShortcut,
  type DashboardRepositoryPort,
  type DashboardSiteSummary,
  type SiteManagerDashboardDetails,
  type SiteManagerDashboardStats,
} from "./dashboard.types.js";

const dashboardRefreshIntervalSeconds = 30;
const dashboardShortcutLimit = 4;

@Injectable()
export class DashboardService {
  public constructor(
    @Inject(DashboardRepository) private readonly dashboardRepository: DashboardRepositoryPort,
    @Inject(OrganizationsService) private readonly organizationsService: OrganizationsService,
  ) {}

  public async getSiteManagerDashboard(
    request: SiteManagerDashboardQueryDto,
    user: AccessTokenPayload,
  ): Promise<SiteManagerDashboardDetails> {
    await this.organizationsService.assertUserHasAnyRole(
      user.organizationId,
      user,
      siteManagerDashboardRoleCodes,
    );

    const siteId = request.siteId ?? null;

    if (siteId) {
      await this.assertSiteDashboardAccess(siteId, user);
    }

    const query = { organizationId: user.organizationId, siteId, userId: user.sub };
    const [sites, alerts, upcomingDeadlines] = await Promise.all([
      this.dashboardRepository.listSiteManagerSiteSummaries(query),
      this.dashboardRepository.listSiteManagerAlerts(query),
      this.dashboardRepository.listSiteManagerDeadlines(query),
    ]);

    return {
      alerts,
      dataSources: this.createDataSources(sites, alerts.length),
      emptyState: this.createEmptyState(sites.length),
      generatedAt: new Date().toISOString(),
      navigationShortcuts: this.createNavigationShortcuts(sites),
      organizationId: user.organizationId,
      realTimeAvailable: false,
      refreshIntervalSeconds: dashboardRefreshIntervalSeconds,
      refreshMode: "http_polling",
      siteId,
      sites,
      stats: this.createStats(sites, upcomingDeadlines.length),
      upcomingDeadlines,
    };
  }

  private async assertSiteDashboardAccess(siteId: string, user: AccessTokenPayload): Promise<void> {
    const siteExists = await this.dashboardRepository.siteExistsInOrganization(
      siteId,
      user.organizationId,
    );

    if (!siteExists) {
      throw new NotFoundException(["Le chantier est introuvable."]);
    }

    const canAccessSite = await this.dashboardRepository.userCanAccessSiteManagerDashboard(
      siteId,
      user.sub,
      siteManagerDashboardRoleCodes,
    );

    if (!canAccessSite) {
      throw new ForbiddenException(["Vous n'avez pas accès à ce chantier."]);
    }
  }

  private createStats(
    sites: readonly DashboardSiteSummary[],
    upcomingDeadlinesCount: number,
  ): SiteManagerDashboardStats {
    const accessibleSitesCount = sites.length;
    const progressTotal = sites.reduce((sum, site) => sum + site.progressPercent, 0);

    return {
      accessibleSitesCount,
      activeAlertsCount: this.sumSites(sites, "activeAlertsCount"),
      activeSitesCount: sites.filter((site) => !["cancelled", "completed"].includes(site.status))
        .length,
      activeWorkersCount: this.sumSites(sites, "activeWorkersCount"),
      criticalAlertsCount: this.sumSites(sites, "criticalAlertsCount"),
      globalProgressPercent:
        accessibleSitesCount > 0 ? Math.round(progressTotal / accessibleSitesCount) : 0,
      taskCompletedCount: this.sumSites(sites, "taskCompletedCount"),
      taskInProgressCount: this.sumSites(sites, "taskInProgressCount"),
      upcomingDeadlinesCount,
    };
  }

  private sumSites(
    sites: readonly DashboardSiteSummary[],
    field:
      | "activeAlertsCount"
      | "activeWorkersCount"
      | "criticalAlertsCount"
      | "taskCompletedCount"
      | "taskInProgressCount",
  ): number {
    return sites.reduce((sum, site) => sum + site[field], 0);
  }

  private createNavigationShortcuts(
    sites: readonly DashboardSiteSummary[],
  ): readonly DashboardNavigationShortcut[] {
    return sites.slice(0, dashboardShortcutLimit).map((site) => ({
      description: "Accéder au détail du chantier.",
      label: `Ouvrir ${site.name}`,
      path: site.detailsPath,
      siteId: site.id,
      type: "site_details",
    }));
  }

  private createDataSources(
    sites: readonly DashboardSiteSummary[],
    visibleAlertCount: number,
  ): readonly DashboardDataSource[] {
    const hasPlanningData = sites.some(
      (site) => site.taskTotalCount > 0 || site.progressPercent > 0 || site.nextDeadlineAt,
    );
    const activeWorkerCount = this.sumSites(sites, "activeWorkersCount");

    return [
      this.createDataSource(
        "planning",
        "Planning chantier",
        this.resolveAvailableOrEmptyStatus(hasPlanningData),
        hasPlanningData
          ? "Données calculées depuis les phases, tâches et échéances."
          : "Aucune phase ou tâche exploitable pour les chantiers accessibles.",
      ),
      this.createDataSource(
        "workers",
        "Ouvriers actifs",
        this.resolveAvailableOrEmptyStatus(activeWorkerCount > 0),
        activeWorkerCount > 0
          ? "Ouvriers actifs calculés depuis les appartenances chantier."
          : "Aucun ouvrier actif associé aux chantiers accessibles.",
      ),
      this.createDataSource(
        "ai_alerts",
        "Alertes et anomalies IA",
        this.resolveAvailableOrEmptyStatus(visibleAlertCount > 0),
        visibleAlertCount > 0
          ? "Alertes ouvertes calculées depuis les anomalies IA persistées."
          : "Aucune alerte IA ouverte pour les chantiers accessibles.",
      ),
      // TODOOOOO : à remplacer avec la vraie donnée temps réel quand les modules drone/IA publieront leurs événements.
      this.createDataSource(
        "real_time_events",
        "Mise à jour temps réel",
        "unavailable",
        "Flux temps réel non connecté, réponse prête pour rafraîchissement HTTP.",
      ),
    ];
  }

  private resolveAvailableOrEmptyStatus(hasData: boolean): DashboardDataSourceStatus {
    return hasData ? "available" : "empty";
  }

  private createDataSource(
    key: string,
    label: string,
    status: DashboardDataSourceStatus,
    message: string,
  ): DashboardDataSource {
    return { key, label, message, status };
  }

  private createEmptyState(siteCount: number) {
    if (siteCount > 0) {
      return null;
    }

    return {
      message: "Aucun chantier n'est associé à votre compte pour le moment.",
      title: "Aucun chantier accessible",
    };
  }
}
