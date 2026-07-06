import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import request from "supertest";
import { afterAll, afterEach, beforeAll, expect, it } from "vitest";

import { configureHttpApp } from "../app-http.js";
import { AppModule } from "../app.module.js";
import type { RegisterResponseDto } from "../auth/auth.dto.js";
import { DatabaseService } from "../database/database.service.js";
import { deleteCreatedOrganizations } from "../organizations/organization-invitations-test-helpers.js";
import { parseApiErrorResponse } from "../organizations/organizations-test-helpers.js";
import type { SiteResponseDto } from "../sites/sites.dto.js";
import {
  createArchitectAnnotation,
  createArchitectBimModel,
  createArchitectIfcFile,
  parseArchitectDashboardResponse,
  setArchitectSiteMemberRoles,
} from "./architect-dashboard-test-helpers.js";
import type { ArchitectDashboardResponseDto } from "./architect-dashboard.dto.js";
import {
  createDashboardAiAlert,
  createDashboardSite,
  createDashboardTestAccount,
  switchAccountRoles,
} from "./dashboard-test-helpers.js";

const createdOrganizationIds = new Set<string>();
let app: INestApplication<Server>;
let databaseService: DatabaseService;

interface SeededArchitectDashboard {
  readonly account: RegisterResponseDto;
  readonly anomalyId: string;
  readonly annotationId: string;
  readonly ifcFileId: string;
  readonly ifcModelId: string;
  readonly site: SiteResponseDto;
}

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

it("aggrege les donnees du dashboard architecte", async () => {
  const seededDashboard = await seedArchitectDashboard();
  const response = await request(getHttpServer())
    .get("/api/dashboard/architect")
    .set("Authorization", `Bearer ${seededDashboard.account.accessToken}`)
    .expect(200);
  const dashboard = parseArchitectDashboardResponse(response);

  expectArchitectDashboardAggregation(dashboard, seededDashboard);
});

it("retourne un etat vide quand aucun projet architecte n'est accessible", async () => {
  const account = await createArchitectDashboardAccount();
  const response = await request(getHttpServer())
    .get("/api/dashboard/architect")
    .set("Authorization", `Bearer ${account.accessToken}`)
    .expect(200);
  const dashboard = parseArchitectDashboardResponse(response);

  expect(dashboard.stats).toMatchObject({
    accessibleProjectsCount: 0,
    activeAiAnomaliesCount: 0,
    ifcFilesCount: 0,
    recentAnnotationsCount: 0,
  });
  expect(dashboard.projects).toStrictEqual([]);
  expect(dashboard.ifcModels).toStrictEqual([]);
  expect(dashboard.annotations).toStrictEqual([]);
  expect(dashboard.aiAnomalies).toStrictEqual([]);
  expect(dashboard.emptyState).toStrictEqual({
    message: "Aucun chantier n'est associé à votre rôle architecte pour le moment.",
    title: "Aucun projet architecte accessible",
  });
});

it("valide le filtre siteId et les permissions du dashboard architecte", async () => {
  const accountA = await createDashboardTestAccount(getHttpServer(), createdOrganizationIds);
  const accountB = await createDashboardTestAccount(getHttpServer(), createdOrganizationIds);
  const accessibleSite = await createDashboardSite(getHttpServer(), accountA, {
    name: "Projet Architecte Accessible",
  });
  const forbiddenSite = await createDashboardSite(getHttpServer(), accountA, {
    name: "Projet Architecte Interdit",
  });

  await switchAccountRoles(databaseService, accountA, ["architecte"]);
  await switchAccountRoles(databaseService, accountB, ["architecte"]);
  await setArchitectSiteMemberRoles(databaseService, accessibleSite.id, accountA.user.id, [
    "architecte",
  ]);
  await setArchitectSiteMemberRoles(databaseService, forbiddenSite.id, accountA.user.id, []);

  const invalidResponse = await request(getHttpServer())
    .get("/api/dashboard/architect?siteId=not-a-uuid")
    .set("Authorization", `Bearer ${accountA.accessToken}`)
    .expect(400);

  expect(parseApiErrorResponse(invalidResponse).message).toContain(
    "Le chantier doit être identifié par un UUID valide.",
  );

  const missingResponse = await request(getHttpServer())
    .get(`/api/dashboard/architect?siteId=${randomUUID()}`)
    .set("Authorization", `Bearer ${accountA.accessToken}`)
    .expect(404);

  expect(parseApiErrorResponse(missingResponse).message).toContain("Le chantier est introuvable.");

  const forbiddenResponse = await request(getHttpServer())
    .get(`/api/dashboard/architect?siteId=${forbiddenSite.id}`)
    .set("Authorization", `Bearer ${accountA.accessToken}`)
    .expect(403);

  expect(parseApiErrorResponse(forbiddenResponse).message).toContain(
    "Vous n'avez pas accès à ce chantier.",
  );

  const isolatedResponse = await request(getHttpServer())
    .get(`/api/dashboard/architect?siteId=${accessibleSite.id}`)
    .set("Authorization", `Bearer ${accountB.accessToken}`)
    .expect(404);

  expect(parseApiErrorResponse(isolatedResponse).message).toContain("Le chantier est introuvable.");
});

it("refuse les utilisateurs sans role architecte", async () => {
  const account = await createDashboardTestAccount(getHttpServer(), createdOrganizationIds);

  await switchAccountRoles(databaseService, account, ["ouvrier"]);

  const response = await request(getHttpServer())
    .get("/api/dashboard/architect")
    .set("Authorization", `Bearer ${account.accessToken}`)
    .expect(403);

  expect(parseApiErrorResponse(response).message).toContain(
    "Vous n'avez pas le rôle requis pour cette action.",
  );
});

function getHttpServer(): Server {
  return app.getHttpServer();
}

async function createArchitectDashboardAccount(): Promise<RegisterResponseDto> {
  const account = await createDashboardTestAccount(getHttpServer(), createdOrganizationIds);
  await switchAccountRoles(databaseService, account, ["architecte"]);

  return account;
}

async function seedArchitectDashboard(): Promise<SeededArchitectDashboard> {
  const account = await createDashboardTestAccount(getHttpServer(), createdOrganizationIds);
  const site = await createDashboardSite(getHttpServer(), account, {
    name: "Projet BIM Recette",
  });

  await switchAccountRoles(databaseService, account, ["architecte"]);
  await setArchitectSiteMemberRoles(databaseService, site.id, account.user.id, ["architecte"]);

  const ifcFileId = await createArchitectIfcFile(
    databaseService,
    account.organization.id,
    site.id,
    account.user.id,
    { originalName: "projet-bim-recette.ifc" },
  );
  const ifcModelId = await createArchitectBimModel(
    databaseService,
    site.id,
    account.user.id,
    ifcFileId,
    { notes: "Version de référence pour recette dashboard.", version: "v2" },
  );
  const annotationId = await createArchitectAnnotation(
    databaseService,
    site.id,
    account.user.id,
    ifcModelId,
    {
      comment: "Décalage détecté avec le relevé terrain.",
      title: "Contrôler mur nord",
    },
  );
  const anomalyId = await createDashboardAiAlert(databaseService, site.id, {
    description: "Écart détecté entre IFC et scan terrain.",
    recommendation: "Vérifier la zone nord dans la maquette.",
    severity: "high",
    type: "bim_discrepancy",
  });

  return { account, anomalyId, annotationId, ifcFileId, ifcModelId, site };
}

function expectArchitectDashboardAggregation(
  dashboard: ArchitectDashboardResponseDto,
  seededDashboard: SeededArchitectDashboard,
): void {
  expect(dashboard.organizationId).toBe(seededDashboard.account.organization.id);
  expect(dashboard.siteId).toBeNull();
  expect(dashboard.realTimeAvailable).toBe(false);
  expect(dashboard.refreshMode).toBe("http_polling");
  expect(dashboard.stats).toMatchObject({
    accessibleProjectsCount: 1,
    activeAiAnomaliesCount: 1,
    bimReviewRequiredProjectsCount: 1,
    ifcFilesCount: 1,
    recentAnnotationsCount: 1,
    validatedBimProjectsCount: 0,
  });
  expect(dashboard.projects).toHaveLength(1);
  expect(dashboard.projects[0]).toMatchObject({
    activeAiAnomaliesCount: 1,
    bimValidationStatus: "review_required",
    ifcModelCount: 1,
    ifcModelPath: `/bim/models/${seededDashboard.ifcModelId}`,
    ifcStatus: "available",
    latestIfcFileId: seededDashboard.ifcFileId,
    latestIfcFileName: "projet-bim-recette.ifc",
    latestIfcModelId: seededDashboard.ifcModelId,
    latestIfcVersion: "v2",
    name: "Projet BIM Recette",
    recentAnnotationsCount: 1,
  });
  expect(dashboard.ifcModels[0]).toMatchObject({
    detailsPath: `/bim/models/${seededDashboard.ifcModelId}`,
    fileId: seededDashboard.ifcFileId,
    fileName: "projet-bim-recette.ifc",
    id: seededDashboard.ifcModelId,
    siteId: seededDashboard.site.id,
    status: "available",
    version: "v2",
  });
  expect(dashboard.annotations[0]).toMatchObject({
    bimModelId: seededDashboard.ifcModelId,
    comment: "Décalage détecté avec le relevé terrain.",
    id: seededDashboard.annotationId,
    siteId: seededDashboard.site.id,
    title: "Contrôler mur nord",
  });
  expect(dashboard.aiAnomalies[0]).toMatchObject({
    description: "Écart détecté entre IFC et scan terrain.",
    id: seededDashboard.anomalyId,
    severity: "high",
    siteId: seededDashboard.site.id,
    type: "bim_discrepancy",
  });
  expect(dashboard.navigationShortcuts[0]).toMatchObject({
    label: "Ouvrir IFC Projet BIM Recette",
    modelId: seededDashboard.ifcModelId,
    path: `/bim/models/${seededDashboard.ifcModelId}`,
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
