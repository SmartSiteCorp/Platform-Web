import type { ArchitectDashboardResponseDto } from "@/generated/api";

const architectDashboardFixture: ArchitectDashboardResponseDto = {
  aiAnomalies: [
    {
      description: "Écart de cote détecté sur le mur porteur nord",
      detailsPath: "/sites/site-id-1/ai-alerts/anomaly-id-1",
      detectedAt: "2026-07-03T08:45:00.000Z",
      id: "anomaly-id-1",
      recommendation: "Vérifier la reprise de maçonnerie avant validation BIM.",
      severity: "high",
      siteId: "site-id-1",
      siteName: "Maison Berger",
      status: "active",
      type: "bim_discrepancy",
    },
  ],
  annotations: [
    {
      bimModelId: "bim-model-id-1",
      comment: "Contrôler l'alignement de la baie vitrée avant export.",
      createdAt: "2026-07-03T09:30:00.000Z",
      detailsPath: "/bim/models/bim-model-id-1/annotations/annotation-id-1",
      id: "annotation-id-1",
      siteId: "site-id-1",
      siteName: "Maison Berger",
      title: "Alignement baie vitrée",
    },
  ],
  dataSources: [
    {
      key: "bim_models",
      label: "Modèles BIM",
      message: "Fichiers IFC calculés depuis les modèles autorisés.",
      status: "available",
    },
    {
      key: "ai_alerts",
      label: "Anomalies IA",
      message: "Module IA non connecté en temps réel, données agrégées côté API.",
      status: "unavailable",
    },
  ],
  emptyState: null,
  generatedAt: "2026-07-03T10:00:00.000Z",
  ifcModels: [
    {
      createdAt: "2026-07-02T14:00:00.000Z",
      detailsPath: "/bim/models/bim-model-id-1",
      fileId: "file-id-1",
      fileName: "maison-berger-v3.ifc",
      id: "bim-model-id-1",
      notes: "Version coordonnée avec le relevé terrain.",
      siteId: "site-id-1",
      siteName: "Maison Berger",
      status: "available",
      version: "3",
    },
  ],
  navigationShortcuts: [
    {
      description: "Accéder au dernier modèle IFC du projet.",
      label: "Ouvrir modèle IFC Maison Berger",
      modelId: "bim-model-id-1",
      path: "/bim/models/bim-model-id-1",
      siteId: "site-id-1",
      type: "ifc_model",
    },
  ],
  organizationId: "organization-id",
  projects: [
    {
      activeAiAnomaliesCount: 1,
      address: "12 rue des Pins, Lyon",
      bimValidationStatus: "review_required",
      criticalAiAnomaliesCount: 0,
      detailsPath: "/sites/site-id-1",
      id: "site-id-1",
      ifcModelCount: 2,
      ifcModelPath: "/bim/models/bim-model-id-1",
      ifcStatus: "available",
      latestIfcCreatedAt: "2026-07-02T14:00:00.000Z",
      latestIfcFileId: "file-id-1",
      latestIfcFileName: "maison-berger-v3.ifc",
      latestIfcModelId: "bim-model-id-1",
      latestIfcVersion: "3",
      name: "Maison Berger",
      recentAnnotationsCount: 1,
      status: "in_progress",
    },
  ],
  realTimeAvailable: false,
  refreshIntervalSeconds: 45,
  refreshMode: "http_polling",
  siteId: null,
  stats: {
    accessibleProjectsCount: 1,
    activeAiAnomaliesCount: 1,
    bimReviewRequiredProjectsCount: 1,
    ifcFilesCount: 2,
    recentAnnotationsCount: 1,
    validatedBimProjectsCount: 0,
  },
};

export function createArchitectDashboardFixture(
  overrides: Partial<ArchitectDashboardResponseDto> = {},
): ArchitectDashboardResponseDto {
  return { ...architectDashboardFixture, ...overrides };
}
