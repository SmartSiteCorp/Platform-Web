import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import type { AccessTokenPayload } from "../auth/auth.types.js";
import { OrganizationsService } from "../organizations/organizations.service.js";
import { getDashboardRefreshIntervalSeconds } from "../shared/config/environment.js";
import type { ArchitectDashboardQueryDto } from "./architect-dashboard.dto.js";
import { ArchitectDashboardRepository } from "./architect-dashboard.repository.js";
import {
  architectDashboardRoleCodes,
  type ArchitectBimValidationStatus,
  type ArchitectDashboardDetails,
  type ArchitectDashboardRepositoryPort,
  type ArchitectDashboardStats,
  type ArchitectDataSource,
  type ArchitectDataSourceStatus,
  type ArchitectIfcModelSummary,
  type ArchitectNavigationShortcut,
  type ArchitectProjectSummary,
} from "./architect-dashboard.types.js";

const architectDashboardShortcutLimit = 4;

@Injectable()
export class ArchitectDashboardService {
  public constructor(
    @Inject(ArchitectDashboardRepository)
    private readonly dashboardRepository: ArchitectDashboardRepositoryPort,
    @Inject(OrganizationsService) private readonly organizationsService: OrganizationsService,
  ) {}

  public async getArchitectDashboard(
    request: ArchitectDashboardQueryDto,
    user: AccessTokenPayload,
  ): Promise<ArchitectDashboardDetails> {
    await this.organizationsService.assertUserHasAnyRole(
      user.organizationId,
      user,
      architectDashboardRoleCodes,
    );

    const siteId = request.siteId ?? null;

    if (siteId) {
      await this.assertSiteDashboardAccess(siteId, user);
    }

    const query = { organizationId: user.organizationId, siteId, userId: user.sub };
    const [rawProjects, ifcModels, annotations, aiAnomalies] = await Promise.all([
      this.dashboardRepository.listArchitectProjects(query),
      this.dashboardRepository.listArchitectIfcModels(query),
      this.dashboardRepository.listArchitectAnnotations(query),
      this.dashboardRepository.listArchitectAiAnomalies(query),
    ]);
    const projects = rawProjects.map((project) => this.withBimValidationStatus(project));
    const refreshIntervalSeconds = getDashboardRefreshIntervalSeconds();

    await this.dashboardRepository.recordArchitectDashboardAccess({
      actorUserId: user.sub,
      organizationId: user.organizationId,
      siteId,
      visibleAiAnomalyCount: aiAnomalies.length,
      visibleIfcModelCount: ifcModels.length,
      visibleProjectCount: projects.length,
    });

    return {
      aiAnomalies,
      annotations,
      dataSources: this.createDataSources(projects, ifcModels.length, annotations.length),
      emptyState: this.createEmptyState(projects.length),
      generatedAt: new Date().toISOString(),
      ifcModels,
      navigationShortcuts: this.createNavigationShortcuts(ifcModels),
      organizationId: user.organizationId,
      projects,
      realTimeAvailable: false,
      refreshIntervalSeconds,
      refreshMode: "http_polling",
      siteId,
      stats: this.createStats(projects),
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

    const canAccessSite = await this.dashboardRepository.userCanAccessArchitectDashboard(
      siteId,
      user.sub,
      architectDashboardRoleCodes,
    );

    if (!canAccessSite) {
      throw new ForbiddenException(["Vous n'avez pas accès à ce chantier."]);
    }
  }

  private withBimValidationStatus(project: ArchitectProjectSummary): ArchitectProjectSummary {
    return { ...project, bimValidationStatus: this.resolveBimValidationStatus(project) };
  }

  private resolveBimValidationStatus(
    project: ArchitectProjectSummary,
  ): ArchitectBimValidationStatus {
    // TODOOOOO : à remplacer avec la vraie validation BIM quand le module IFC/AR sera branché.
    if (project.ifcModelCount === 0 || project.ifcStatus === "missing") {
      return "pending";
    }

    if (project.criticalAiAnomaliesCount > 0 || project.ifcStatus === "invalid") {
      return "blocked";
    }

    if (project.activeAiAnomaliesCount > 0 || project.recentAnnotationsCount > 0) {
      return "review_required";
    }

    return "validated";
  }

  private createStats(projects: readonly ArchitectProjectSummary[]): ArchitectDashboardStats {
    return {
      accessibleProjectsCount: projects.length,
      activeAiAnomaliesCount: this.sumProjects(projects, "activeAiAnomaliesCount"),
      bimReviewRequiredProjectsCount: projects.filter((project) =>
        ["blocked", "pending", "review_required"].includes(project.bimValidationStatus),
      ).length,
      ifcFilesCount: this.sumProjects(projects, "ifcModelCount"),
      recentAnnotationsCount: this.sumProjects(projects, "recentAnnotationsCount"),
      validatedBimProjectsCount: projects.filter(
        (project) => project.bimValidationStatus === "validated",
      ).length,
    };
  }

  private sumProjects(
    projects: readonly ArchitectProjectSummary[],
    field: "activeAiAnomaliesCount" | "ifcModelCount" | "recentAnnotationsCount",
  ): number {
    return projects.reduce((sum, project) => sum + project[field], 0);
  }

  private createNavigationShortcuts(
    ifcModels: readonly ArchitectIfcModelSummary[],
  ): readonly ArchitectNavigationShortcut[] {
    return ifcModels.slice(0, architectDashboardShortcutLimit).map((model) => ({
      description: "Accéder au modèle IFC le plus récent.",
      label: `Ouvrir IFC ${model.siteName}`,
      modelId: model.id,
      path: model.detailsPath,
      siteId: model.siteId,
      type: "ifc_model_details",
    }));
  }

  private createDataSources(
    projects: readonly ArchitectProjectSummary[],
    ifcModelCount: number,
    annotationCount: number,
  ): readonly ArchitectDataSource[] {
    const anomalyCount = this.sumProjects(projects, "activeAiAnomaliesCount");

    return [
      this.createDataSource(
        "bim_models",
        "Modèles IFC",
        this.resolveAvailableOrEmptyStatus(ifcModelCount > 0),
        ifcModelCount > 0
          ? "Fichiers IFC calculés depuis les modèles BIM persistés."
          : "Aucun modèle IFC associé aux projets accessibles.",
      ),
      this.createDataSource(
        "ar_annotations",
        "Annotations architecte",
        this.resolveAvailableOrEmptyStatus(annotationCount > 0),
        annotationCount > 0
          ? "Annotations calculées depuis les données AR persistées."
          : "Aucune annotation architecte récente pour ce périmètre.",
      ),
      this.createDataSource(
        "ai_alerts",
        "Anomalies IA",
        this.resolveAvailableOrEmptyStatus(anomalyCount > 0),
        anomalyCount > 0
          ? "Anomalies ouvertes calculées depuis les alertes IA persistées."
          : "Aucune anomalie IA ouverte pour les projets accessibles.",
      ),
      // TODOOOOO : à remplacer avec la vraie donnée de validation BIM du module IFC.
      this.createDataSource(
        "bim_validations",
        "Validations BIM",
        this.resolveAvailableOrEmptyStatus(projects.length > 0),
        projects.length > 0
          ? "Statuts provisoires calculés depuis IFC, annotations et anomalies."
          : "Aucun projet accessible à valider.",
      ),
      // TODOOOOO : à remplacer avec la vraie synchronisation chantier/AR/IA temps réel.
      this.createDataSource(
        "project_sync",
        "Synchronisation chantier",
        "unavailable",
        "Flux temps réel non connecté, réponse prête pour rafraîchissement HTTP.",
      ),
    ];
  }

  private resolveAvailableOrEmptyStatus(hasData: boolean): ArchitectDataSourceStatus {
    return hasData ? "available" : "empty";
  }

  private createDataSource(
    key: string,
    label: string,
    status: ArchitectDataSourceStatus,
    message: string,
  ): ArchitectDataSource {
    return { key, label, message, status };
  }

  private createEmptyState(projectCount: number) {
    if (projectCount > 0) {
      return null;
    }

    return {
      message: "Aucun chantier n'est associé à votre rôle architecte pour le moment.",
      title: "Aucun projet architecte accessible",
    };
  }
}
