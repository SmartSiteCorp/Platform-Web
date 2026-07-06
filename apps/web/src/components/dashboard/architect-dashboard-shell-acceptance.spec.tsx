import { render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ArchitectDashboardResponseDto } from "@/generated/api";
import { saveAuthSession } from "@/lib/auth-session";
import type { LoadArchitectDashboardResult } from "@/lib/dashboard";
import { createAuthSessionFixture } from "@/test/auth-session-fixture";
import {
  ArchitectDashboardShell,
  type ArchitectDashboardLoader,
} from "./architect-dashboard-shell";

const routerMock = vi.hoisted(() => ({
  replace: vi.fn<(url: string) => void>(),
}));

const searchParamsMock = vi.hoisted(() => new URLSearchParams());

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  useSearchParams: () => searchParamsMock,
}));

beforeEach(() => {
  routerMock.replace.mockClear();
  resetSearchParams();
  window.localStorage.clear();
});

describe("ArchitectDashboardShell recette architecte", () => {
  it("affiche les indicateurs CDC et les liens vers les modeles IFC", async () => {
    const { loader, session } = renderAuthenticatedDashboard();

    expect(await screen.findByRole("heading", { name: "Projet BIM Recette" })).toBeInTheDocument();
    expectStatValue("Projets associés", "1");
    expectStatValue("Fichiers IFC", "1");
    expectStatValue("Annotations récentes", "1");
    expectStatValue("Anomalies IA", "1");
    expectStatValue("Validations BIM", "0");
    expect(screen.getAllByText("modele-ifc-recette.ifc").length).toBeGreaterThan(0);
    expect(screen.getByText("Annotation recette BIM")).toBeInTheDocument();
    expect(screen.getByText("Écart recette entre plan et terrain.")).toBeInTheDocument();
    expectLinkHref(/modele-ifc-recette.ifc/i, "/bim/models/model-recette-id");
    expectLinkHref(/Ouvrir IFC Projet BIM Recette/i, "/bim/models/model-recette-id");
    expect(loader).toHaveBeenCalledWith(session.accessToken, null);
  });

  it("programme le rafraichissement selon l'intervalle retourne par l'API", async () => {
    const setIntervalSpy = vi.spyOn(window, "setInterval");

    try {
      renderAuthenticatedDashboard();

      expect(
        await screen.findByRole("heading", { name: "Projet BIM Recette" }),
      ).toBeInTheDocument();

      await waitFor(() => {
        expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000);
      });
    } finally {
      setIntervalSpy.mockRestore();
    }
  });
});

function renderAuthenticatedDashboard(
  loader = createDashboardLoader({ dashboard: architectDashboardAcceptanceFixture, ok: true }),
) {
  const session = createAuthSessionFixture({ roles: ["architecte"] });

  saveAuthSession(session);
  render(<ArchitectDashboardShell dashboardLoader={loader} />);

  return { loader, session };
}

function createDashboardLoader(result: LoadArchitectDashboardResult) {
  return vi.fn<ArchitectDashboardLoader>().mockResolvedValue(result);
}

function expectLinkHref(label: RegExp, href: string): void {
  const hasMatchingLink = screen
    .getAllByRole("link", { name: label })
    .some((linkElement) => linkElement.getAttribute("href") === href);

  expect(hasMatchingLink).toBe(true);
}

function expectStatValue(label: string, value: string): void {
  const hasMatchingStat = screen.getAllByText(label).some((labelElement) => {
    const statContainer = labelElement.parentElement;

    return statContainer ? within(statContainer).queryByText(value) !== null : false;
  });

  expect(hasMatchingStat).toBe(true);
}

function resetSearchParams(): void {
  Array.from(searchParamsMock.keys()).forEach((key) => {
    searchParamsMock.delete(key);
  });
}

const architectDashboardAcceptanceFixture: ArchitectDashboardResponseDto = {
  aiAnomalies: [
    {
      description: "Écart recette entre plan et terrain.",
      detailsPath: "/sites/site-recette-id/alerts/anomaly-recette-id",
      detectedAt: "2026-07-06T08:45:00.000Z",
      id: "anomaly-recette-id",
      recommendation: "Comparer le scan terrain avec la maquette IFC.",
      severity: "high",
      siteId: "site-recette-id",
      siteName: "Projet BIM Recette",
      status: "open",
      type: "bim_discrepancy",
    },
  ],
  annotations: [
    {
      bimModelId: "model-recette-id",
      comment: "Contrôle recette avant validation du modèle.",
      createdAt: "2026-07-06T09:30:00.000Z",
      detailsPath: "/bim/models/model-recette-id/annotations/annotation-recette-id",
      id: "annotation-recette-id",
      siteId: "site-recette-id",
      siteName: "Projet BIM Recette",
      title: "Annotation recette BIM",
    },
  ],
  dataSources: [
    {
      key: "bim_models",
      label: "Modèles IFC",
      message: "Fichiers IFC calculés depuis les modèles BIM persistés.",
      status: "available",
    },
    {
      key: "project_sync",
      label: "Synchronisation chantier",
      message: "Flux temps réel non connecté, réponse prête pour rafraîchissement HTTP.",
      status: "unavailable",
    },
  ],
  emptyState: null,
  generatedAt: "2026-07-06T10:00:00.000Z",
  ifcModels: [
    {
      createdAt: "2026-07-06T08:00:00.000Z",
      detailsPath: "/bim/models/model-recette-id",
      fileId: "file-recette-id",
      fileName: "modele-ifc-recette.ifc",
      id: "model-recette-id",
      notes: "Version de recette reliée au chantier.",
      siteId: "site-recette-id",
      siteName: "Projet BIM Recette",
      status: "available",
      version: "v-recette",
    },
  ],
  navigationShortcuts: [
    {
      description: "Accéder au modèle IFC le plus récent.",
      label: "Ouvrir IFC Projet BIM Recette",
      modelId: "model-recette-id",
      path: "/bim/models/model-recette-id",
      siteId: "site-recette-id",
      type: "ifc_model_details",
    },
  ],
  organizationId: "organization-recette-id",
  projects: [
    {
      activeAiAnomaliesCount: 1,
      address: "18 avenue des Plans, Lyon",
      bimValidationStatus: "review_required",
      criticalAiAnomaliesCount: 0,
      detailsPath: "/sites/site-recette-id",
      id: "site-recette-id",
      ifcModelCount: 1,
      ifcModelPath: "/bim/models/model-recette-id",
      ifcStatus: "available",
      latestIfcCreatedAt: "2026-07-06T08:00:00.000Z",
      latestIfcFileId: "file-recette-id",
      latestIfcFileName: "modele-ifc-recette.ifc",
      latestIfcModelId: "model-recette-id",
      latestIfcVersion: "v-recette",
      name: "Projet BIM Recette",
      recentAnnotationsCount: 1,
      status: "in_progress",
    },
  ],
  realTimeAvailable: false,
  refreshIntervalSeconds: 30,
  refreshMode: "http_polling",
  siteId: null,
  stats: {
    accessibleProjectsCount: 1,
    activeAiAnomaliesCount: 1,
    bimReviewRequiredProjectsCount: 1,
    ifcFilesCount: 1,
    recentAnnotationsCount: 1,
    validatedBimProjectsCount: 0,
  },
};
