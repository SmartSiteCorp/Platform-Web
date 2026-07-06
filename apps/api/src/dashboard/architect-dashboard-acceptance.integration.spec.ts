import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import request from "supertest";
import { afterAll, afterEach, beforeAll, expect, it } from "vitest";

import { configureHttpApp } from "../app-http.js";
import { AppModule } from "../app.module.js";
import { DatabaseService } from "../database/database.service.js";
import { deleteCreatedOrganizations } from "../organizations/organization-invitations-test-helpers.js";
import { parseApiErrorResponse } from "../organizations/organizations-test-helpers.js";
import type { SiteResponseDto } from "../sites/sites.dto.js";
import {
  authorizeArchitectSite,
  createArchitectDashboardAcceptanceAccount,
  getArchitectDashboard,
  seedArchitectDashboardAcceptanceFixture,
  seedSingleArchitectProject,
  type ArchitectDashboardAcceptanceFixture,
} from "./architect-dashboard-acceptance-test-helpers.js";
import type { ArchitectDashboardResponseDto } from "./architect-dashboard.dto.js";
import { setArchitectSiteMemberRoles } from "./architect-dashboard-test-helpers.js";
import { createDashboardSite, switchAccountRoles } from "./dashboard-test-helpers.js";

const createdOrganizationIds = new Set<string>();
let app: INestApplication<Server>;
let databaseService: DatabaseService;

beforeAll(async () => {
  process.env.AUTH_REGISTER_RATE_LIMIT_LIMIT = "100";
  process.env.AUTH_REGISTER_RATE_LIMIT_TTL_SECONDS = "60";

  const testingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = testingModule.createNestApplication<INestApplication<Server>>();
  configureHttpApp(app);
  await app.init();

  databaseService = app.get(DatabaseService);
});

afterEach(async () => {
  await deleteCreatedOrganizations(databaseService, createdOrganizationIds);
  createdOrganizationIds.clear();
});

afterAll(async () => {
  await app.close();
});

it("valide la recette CDC du dashboard architecte", async () => {
  const fixture = await seedArchitectDashboardAcceptanceFixture(
    databaseService,
    getHttpServer(),
    createdOrganizationIds,
  );
  const dashboard = await getArchitectDashboard(getHttpServer(), fixture.account);

  expect(dashboard.organizationId).toBe(fixture.account.organization.id);
  expect(dashboard.siteId).toBeNull();
  expect(dashboard.refreshMode).toBe("http_polling");
  expect(dashboard.refreshIntervalSeconds).toBeGreaterThanOrEqual(15);
  expect(dashboard.realTimeAvailable).toBe(false);
  expect(dashboard.stats).toMatchObject({
    accessibleProjectsCount: 1,
    activeAiAnomaliesCount: 1,
    bimReviewRequiredProjectsCount: 1,
    ifcFilesCount: 1,
    recentAnnotationsCount: 1,
    validatedBimProjectsCount: 0,
  });
  expectArchitectProjectsMeetAcceptanceCriteria(dashboard, fixture);
  expectArchitectBimDataMeetAcceptanceCriteria(dashboard, fixture);
  expectArchitectAnomaliesAndNavigationMeetAcceptanceCriteria(dashboard, fixture);
});

it("valide les erreurs d'authentification et de filtre chantier", async () => {
  const account = await createArchitectDashboardAcceptanceAccount(
    getHttpServer(),
    createdOrganizationIds,
  );

  await switchAccountRoles(databaseService, account, ["architecte"]);

  await request(getHttpServer()).get("/api/dashboard/architect").expect(401);

  const invalidResponse = await request(getHttpServer())
    .get("/api/dashboard/architect?siteId=chantier-invalide")
    .set("Authorization", `Bearer ${account.accessToken}`)
    .expect(400);

  expect(parseApiErrorResponse(invalidResponse).message).toContain(
    "Le chantier doit être identifié par un UUID valide.",
  );

  const missingResponse = await request(getHttpServer())
    .get(`/api/dashboard/architect?siteId=${randomUUID()}`)
    .set("Authorization", `Bearer ${account.accessToken}`)
    .expect(404);

  expect(parseApiErrorResponse(missingResponse).message).toContain("Le chantier est introuvable.");
});

it("valide les permissions par role, chantier et organisation", async () => {
  const accountA = await createArchitectDashboardAcceptanceAccount(
    getHttpServer(),
    createdOrganizationIds,
  );
  const accountB = await createArchitectDashboardAcceptanceAccount(
    getHttpServer(),
    createdOrganizationIds,
  );
  const siteA = await createDashboardSite(getHttpServer(), accountA, {
    name: "Projet Architecte Organisation A",
  });
  const siteB = await createDashboardSite(getHttpServer(), accountB, {
    name: "Projet Architecte Organisation B",
  });
  const forbiddenSite = await createDashboardSite(getHttpServer(), accountA, {
    name: "Projet Architecte Sans Accès",
  });

  await switchAccountRoles(databaseService, accountA, ["architecte"]);
  await switchAccountRoles(databaseService, accountB, ["architecte"]);
  await authorizeArchitectSite(databaseService, accountA, siteA);
  await authorizeArchitectSite(databaseService, accountB, siteB);
  await seedAuthorizedProject(accountA, siteA, "modele-architecte-org-a.ifc");
  await seedAuthorizedProject(accountB, siteB, "modele-architecte-org-b.ifc");
  await seedAuthorizedProject(accountA, forbiddenSite, "modele-architecte-sans-acces.ifc");
  await setArchitectSiteMemberRoles(databaseService, forbiddenSite.id, accountA.user.id, []);

  const isolatedResponse = await request(getHttpServer())
    .get(`/api/dashboard/architect?siteId=${siteA.id}`)
    .set("Authorization", `Bearer ${accountB.accessToken}`)
    .expect(404);

  expect(parseApiErrorResponse(isolatedResponse).message).toContain("Le chantier est introuvable.");

  const forbiddenResponse = await request(getHttpServer())
    .get(`/api/dashboard/architect?siteId=${forbiddenSite.id}`)
    .set("Authorization", `Bearer ${accountA.accessToken}`)
    .expect(403);

  expect(parseApiErrorResponse(forbiddenResponse).message).toContain(
    "Vous n'avez pas accès à ce chantier.",
  );

  const dashboardA = await getArchitectDashboard(getHttpServer(), accountA);
  const serializedDashboardA = JSON.stringify(dashboardA);

  expect(dashboardA.organizationId).toBe(accountA.organization.id);
  expect(dashboardA.projects.map((project) => project.id)).toStrictEqual([siteA.id]);
  expect(serializedDashboardA).toContain("modele-architecte-org-a.ifc");
  expect(serializedDashboardA).not.toContain(siteB.name);
  expect(serializedDashboardA).not.toContain("modele-architecte-org-b.ifc");
  expect(serializedDashboardA).not.toContain(forbiddenSite.name);
  expect(serializedDashboardA).not.toContain("modele-architecte-sans-acces.ifc");

  await switchAccountRoles(databaseService, accountA, ["ouvrier"]);

  const forbiddenRoleResponse = await request(getHttpServer())
    .get(`/api/dashboard/architect?siteId=${siteA.id}`)
    .set("Authorization", `Bearer ${accountA.accessToken}`)
    .expect(403);

  expect(parseApiErrorResponse(forbiddenRoleResponse).message).toContain(
    "Vous n'avez pas le rôle requis pour cette action.",
  );
});

function getHttpServer(): Server {
  return app.getHttpServer();
}

async function seedAuthorizedProject(
  account: ArchitectDashboardAcceptanceFixture["account"],
  site: SiteResponseDto,
  ifcFileName: string,
): Promise<void> {
  await seedSingleArchitectProject(databaseService, account, site, {
    annotationTitle: `Annotation ${site.name}`,
    anomalyDescription: `Anomalie IA ${site.name}`,
    ifcFileName,
  });
}

function expectArchitectProjectsMeetAcceptanceCriteria(
  dashboard: ArchitectDashboardResponseDto,
  fixture: ArchitectDashboardAcceptanceFixture,
): void {
  expect(dashboard.projects).toHaveLength(1);
  expect(dashboard.projects[0]).toMatchObject({
    activeAiAnomaliesCount: 1,
    bimValidationStatus: "review_required",
    detailsPath: `/sites/${fixture.site.id}`,
    ifcModelCount: 1,
    ifcModelPath: `/bim/models/${fixture.ifcModelId}`,
    ifcStatus: "available",
    latestIfcFileId: fixture.ifcFileId,
    latestIfcFileName: fixture.ifcFileName,
    latestIfcModelId: fixture.ifcModelId,
    latestIfcVersion: "v-recette",
    name: "Projet BIM Recette",
    recentAnnotationsCount: 1,
  });
}

function expectArchitectBimDataMeetAcceptanceCriteria(
  dashboard: ArchitectDashboardResponseDto,
  fixture: ArchitectDashboardAcceptanceFixture,
): void {
  expect(dashboard.ifcModels).toHaveLength(1);
  expect(dashboard.ifcModels[0]).toMatchObject({
    detailsPath: `/bim/models/${fixture.ifcModelId}`,
    fileId: fixture.ifcFileId,
    fileName: fixture.ifcFileName,
    id: fixture.ifcModelId,
    siteId: fixture.site.id,
    siteName: "Projet BIM Recette",
    status: "available",
    version: "v-recette",
  });
  expect(dashboard.annotations).toHaveLength(1);
  expect(dashboard.annotations[0]).toMatchObject({
    bimModelId: fixture.ifcModelId,
    comment: "Contrôle recette avant validation du modèle.",
    detailsPath: `/bim/models/${fixture.ifcModelId}/annotations/${fixture.annotationId}`,
    id: fixture.annotationId,
    siteId: fixture.site.id,
    siteName: "Projet BIM Recette",
    title: "Annotation recette BIM",
  });
}

function expectArchitectAnomaliesAndNavigationMeetAcceptanceCriteria(
  dashboard: ArchitectDashboardResponseDto,
  fixture: ArchitectDashboardAcceptanceFixture,
): void {
  expect(dashboard.aiAnomalies).toHaveLength(1);
  expect(dashboard.aiAnomalies[0]).toMatchObject({
    description: "Écart recette entre plan et terrain.",
    detailsPath: `/sites/${fixture.site.id}/alerts/${fixture.anomalyId}`,
    id: fixture.anomalyId,
    recommendation: "Comparer le scan terrain avec la maquette IFC.",
    severity: "high",
    siteId: fixture.site.id,
    siteName: "Projet BIM Recette",
    status: "open",
    type: "bim_discrepancy",
  });
  expect(dashboard.navigationShortcuts).toContainEqual({
    description: "Accéder au modèle IFC le plus récent.",
    label: "Ouvrir IFC Projet BIM Recette",
    modelId: fixture.ifcModelId,
    path: `/bim/models/${fixture.ifcModelId}`,
    siteId: fixture.site.id,
    type: "ifc_model_details",
  });
  expect(dashboard.dataSources).toContainEqual({
    key: "project_sync",
    label: "Synchronisation chantier",
    message: "Flux temps réel non connecté, réponse prête pour rafraîchissement HTTP.",
    status: "unavailable",
  });
  expect(dashboard.emptyState).toBeNull();
}
