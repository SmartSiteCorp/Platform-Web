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
import type { SiteManagerDashboardResponseDto } from "./dashboard.dto.js";
import {
  createDashboardAiAlert,
  createDashboardPhase,
  createDashboardSite,
  createDashboardTask,
  createDashboardTestAccount,
  createDashboardWorker,
  markSiteInProgress,
  parseDashboardResponse,
  switchAccountRoles,
} from "./dashboard-test-helpers.js";

const createdOrganizationIds = new Set<string>();
let app: INestApplication<Server>;
let databaseService: DatabaseService;

interface DashboardAcceptanceFixture {
  readonly account: RegisterResponseDto;
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

it("valide la recette CDC du dashboard chef de chantier", async () => {
  const fixture = await seedDashboardAcceptanceFixture();
  const response = await request(getHttpServer())
    .get("/api/dashboard/site-manager")
    .set("Authorization", `Bearer ${fixture.account.accessToken}`)
    .expect(200);
  const dashboard = parseDashboardResponse(response);

  expect(dashboard.organizationId).toBe(fixture.account.organization.id);
  expect(dashboard.refreshMode).toBe("http_polling");
  expect(dashboard.refreshIntervalSeconds).toBeGreaterThanOrEqual(15);
  expect(dashboard.stats).toMatchObject({
    activeAlertsCount: 1,
    activeSitesCount: 1,
    activeWorkersCount: 1,
    globalProgressPercent: 60,
    taskCompletedCount: 1,
    taskInProgressCount: 1,
  });
  expect(dashboard.upcomingDeadlines.length).toBeGreaterThanOrEqual(3);
  expectDashboardSiteMeetsAcceptanceCriteria(dashboard, fixture.site);
  expectDashboardNavigationMeetsAcceptanceCriteria(dashboard, fixture.site);
});

it("valide les erreurs d'authentification et de filtre site", async () => {
  const account = await createChefChantierDashboardAccount();

  await request(getHttpServer()).get("/api/dashboard/site-manager").expect(401);

  const invalidResponse = await request(getHttpServer())
    .get("/api/dashboard/site-manager?siteId=chantier-invalide")
    .set("Authorization", `Bearer ${account.accessToken}`)
    .expect(400);

  expect(parseApiErrorResponse(invalidResponse).message).toContain(
    "Le chantier doit être identifié par un UUID valide.",
  );

  const missingResponse = await request(getHttpServer())
    .get(`/api/dashboard/site-manager?siteId=${randomUUID()}`)
    .set("Authorization", `Bearer ${account.accessToken}`)
    .expect(404);

  expect(parseApiErrorResponse(missingResponse).message).toContain("Le chantier est introuvable.");
});

it("valide les permissions par role et l'isolation entre organisations", async () => {
  const accountA = await createChefChantierDashboardAccount();
  const accountB = await createChefChantierDashboardAccount();
  const siteA = await createDashboardSite(getHttpServer(), accountA, {
    name: "Chantier Organisation A",
  });
  const siteB = await createDashboardSite(getHttpServer(), accountB, {
    name: "Chantier Organisation B",
  });

  const isolatedResponse = await request(getHttpServer())
    .get(`/api/dashboard/site-manager?siteId=${siteA.id}`)
    .set("Authorization", `Bearer ${accountB.accessToken}`)
    .expect(404);

  expect(parseApiErrorResponse(isolatedResponse).message).toContain("Le chantier est introuvable.");

  const dashboardB = await getDashboard(accountB);
  const serializedDashboardB = JSON.stringify(dashboardB);

  expect(dashboardB.organizationId).toBe(accountB.organization.id);
  expect(dashboardB.sites.map((site) => site.id)).toStrictEqual([siteB.id]);
  expect(serializedDashboardB).not.toContain(siteA.id);
  expect(serializedDashboardB).not.toContain(siteA.name);

  await switchAccountRoles(databaseService, accountA, ["ouvrier"]);

  const forbiddenResponse = await request(getHttpServer())
    .get(`/api/dashboard/site-manager?siteId=${siteA.id}`)
    .set("Authorization", `Bearer ${accountA.accessToken}`)
    .expect(403);

  expect(parseApiErrorResponse(forbiddenResponse).message).toContain(
    "Vous n'avez pas le rôle requis pour cette action.",
  );
});

function getHttpServer(): Server {
  return app.getHttpServer();
}

async function createChefChantierDashboardAccount(): Promise<RegisterResponseDto> {
  const account = await createDashboardTestAccount(getHttpServer(), createdOrganizationIds);
  await switchAccountRoles(databaseService, account, ["chef_chantier"]);

  return account;
}

async function seedDashboardAcceptanceFixture(): Promise<DashboardAcceptanceFixture> {
  const account = await createChefChantierDashboardAccount();
  const site = await createDashboardSite(getHttpServer(), account, {
    name: "Résidence Recette",
  });

  await markSiteInProgress(databaseService, site.id);
  const foundationsPhaseId = await createDashboardPhase(databaseService, site.id, {
    estimatedDurationDays: 8,
    name: "Fondations",
    progressPercent: 50,
  });
  const structurePhaseId = await createDashboardPhase(databaseService, site.id, {
    estimatedDurationDays: 12,
    name: "Structure",
    progressPercent: 70,
    startDate: "2026-07-10",
  });

  await createDashboardTask(databaseService, site.id, account.user.id, {
    dueDate: "2026-07-06",
    phaseId: foundationsPhaseId,
    status: "in_progress",
    title: "Contrôle sécurité échafaudage",
  });
  await createDashboardTask(databaseService, site.id, account.user.id, {
    phaseId: foundationsPhaseId,
    status: "completed",
    title: "Validation implantation",
  });
  await createDashboardTask(databaseService, site.id, account.user.id, {
    dueDate: "2026-07-18",
    phaseId: structurePhaseId,
    status: "todo",
    title: "Préparer contrôle dalle",
  });
  await createDashboardWorker(databaseService, account.organization.id, site.id);
  await createDashboardAiAlert(databaseService, site.id, {
    description: "Anomalie critique sur la zone nord.",
    type: "ai_anomaly",
  });
  await createDashboardAiAlert(databaseService, site.id, {
    resolved: true,
    severity: "medium",
  });

  return { account, site };
}

async function getDashboard(
  account: RegisterResponseDto,
): Promise<SiteManagerDashboardResponseDto> {
  const response = await request(getHttpServer())
    .get("/api/dashboard/site-manager")
    .set("Authorization", `Bearer ${account.accessToken}`)
    .expect(200);

  return parseDashboardResponse(response);
}

function expectDashboardSiteMeetsAcceptanceCriteria(
  dashboard: SiteManagerDashboardResponseDto,
  site: SiteResponseDto,
): void {
  expect(dashboard.sites).toHaveLength(1);
  expect(dashboard.sites[0]).toMatchObject({
    activeAlertsCount: 1,
    activeWorkersCount: 1,
    criticalAlertsCount: 1,
    detailsPath: `/sites/${site.id}`,
    id: site.id,
    name: "Résidence Recette",
    progressPercent: 60,
    taskCompletedCount: 1,
    taskInProgressCount: 1,
    taskTotalCount: 3,
  });
  expect(dashboard.alerts).toHaveLength(1);
  expect(dashboard.alerts[0]).toMatchObject({
    description: "Anomalie critique sur la zone nord.",
    severity: "critical",
    siteId: site.id,
    type: "ai_anomaly",
  });
  expect(dashboard.upcomingDeadlines.map((deadline) => deadline.label)).toContain(
    "Contrôle sécurité échafaudage",
  );
}

function expectDashboardNavigationMeetsAcceptanceCriteria(
  dashboard: SiteManagerDashboardResponseDto,
  site: SiteResponseDto,
): void {
  expect(dashboard.navigationShortcuts).toContainEqual({
    description: "Accéder au détail du chantier.",
    label: "Ouvrir Résidence Recette",
    path: `/sites/${site.id}`,
    siteId: site.id,
    type: "site_details",
  });
  expect(dashboard.dataSources).toContainEqual({
    key: "real_time_events",
    label: "Mise à jour temps réel",
    message: "Flux temps réel non connecté, réponse prête pour rafraîchissement HTTP.",
    status: "unavailable",
  });
}
