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

interface SeededDashboardAggregation {
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

it("aggrege les donnees du dashboard chef de chantier", async () => {
  const seededDashboard = await seedDashboardAggregation();
  const response = await request(getHttpServer())
    .get("/api/dashboard/site-manager")
    .set("Authorization", `Bearer ${seededDashboard.account.accessToken}`)
    .expect(200);
  const dashboard = parseDashboardResponse(response);

  expectDashboardAggregation(dashboard, seededDashboard);
});

it("filtre les donnees selon l'appartenance chantier", async () => {
  const account = await createDashboardTestAccount(getHttpServer(), createdOrganizationIds);

  await switchAccountRoles(databaseService, account, ["chef_chantier"]);

  const accessibleSite = await createDashboardSite(getHttpServer(), account, {
    name: "Chantier accessible",
  });
  const hiddenSite = await createDashboardSite(getHttpServer(), account, {
    name: "Chantier masqué",
  });

  await databaseService.query("DELETE FROM site_members WHERE site_id = $1 AND user_id = $2", [
    hiddenSite.id,
    account.user.id,
  ]);

  const response = await request(getHttpServer())
    .get("/api/dashboard/site-manager")
    .set("Authorization", `Bearer ${account.accessToken}`)
    .expect(200);
  const dashboard = parseDashboardResponse(response);

  expect(dashboard.sites.map((site) => site.id)).toStrictEqual([accessibleSite.id]);

  const forbiddenResponse = await request(getHttpServer())
    .get(`/api/dashboard/site-manager?siteId=${hiddenSite.id}`)
    .set("Authorization", `Bearer ${account.accessToken}`)
    .expect(403);

  expect(parseApiErrorResponse(forbiddenResponse).message).toContain(
    "Vous n'avez pas accès à ce chantier.",
  );
});

it("retourne un etat vide quand aucun chantier n'est accessible", async () => {
  const account = await createDashboardTestAccount(getHttpServer(), createdOrganizationIds);

  await switchAccountRoles(databaseService, account, ["chef_chantier"]);

  const response = await request(getHttpServer())
    .get("/api/dashboard/site-manager")
    .set("Authorization", `Bearer ${account.accessToken}`)
    .expect(200);
  const dashboard = parseDashboardResponse(response);

  expect(dashboard.stats.accessibleSitesCount).toBe(0);
  expect(dashboard.sites).toStrictEqual([]);
  expect(dashboard.alerts).toStrictEqual([]);
  expect(dashboard.upcomingDeadlines).toStrictEqual([]);
  expect(dashboard.emptyState).toStrictEqual({
    message: "Aucun chantier n'est associé à votre compte pour le moment.",
    title: "Aucun chantier accessible",
  });
});

it("refuse les utilisateurs sans role dashboard chantier", async () => {
  const account = await createDashboardTestAccount(getHttpServer(), createdOrganizationIds);

  await switchAccountRoles(databaseService, account, ["ouvrier"]);

  const response = await request(getHttpServer())
    .get("/api/dashboard/site-manager")
    .set("Authorization", `Bearer ${account.accessToken}`)
    .expect(403);

  expect(parseApiErrorResponse(response).message).toContain(
    "Vous n'avez pas le rôle requis pour cette action.",
  );
});

it("valide le filtre siteId du dashboard", async () => {
  const account = await createDashboardTestAccount(getHttpServer(), createdOrganizationIds);

  await switchAccountRoles(databaseService, account, ["chef_chantier"]);

  const invalidResponse = await request(getHttpServer())
    .get("/api/dashboard/site-manager?siteId=not-a-uuid")
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

function getHttpServer(): Server {
  return app.getHttpServer();
}

async function seedDashboardAggregation(): Promise<SeededDashboardAggregation> {
  const account = await createDashboardTestAccount(getHttpServer(), createdOrganizationIds);

  await switchAccountRoles(databaseService, account, ["chef_chantier"]);

  const site = await createDashboardSite(getHttpServer(), account, {
    name: "Résidence Horizon",
  });

  await markSiteInProgress(databaseService, site.id);
  const firstPhaseId = await createDashboardPhase(databaseService, site.id, {
    name: "Fondations",
    progressPercent: 40,
  });
  const secondPhaseId = await createDashboardPhase(databaseService, site.id, {
    name: "Gros œuvre",
    progressPercent: 80,
  });

  await createDashboardTasks(site.id, account.user.id, firstPhaseId, secondPhaseId);
  await createDashboardWorker(databaseService, account.organization.id, site.id);
  await createDashboardAiAlert(databaseService, site.id);
  await createDashboardAiAlert(databaseService, site.id, {
    resolved: true,
    severity: "medium",
  });

  return { account, site };
}

async function createDashboardTasks(
  siteId: string,
  userId: string,
  firstPhaseId: string,
  secondPhaseId: string,
): Promise<void> {
  await createDashboardTask(databaseService, siteId, userId, {
    dueDate: "2026-07-08",
    phaseId: firstPhaseId,
    status: "in_progress",
    title: "Contrôle ferraillage",
  });
  await createDashboardTask(databaseService, siteId, userId, {
    phaseId: firstPhaseId,
    status: "completed",
    title: "Implantation",
  });
  await createDashboardTask(databaseService, siteId, userId, {
    dueDate: "2026-07-20",
    phaseId: secondPhaseId,
    status: "todo",
    title: "Préparation coffrage",
  });
}

function expectDashboardAggregation(
  dashboard: SiteManagerDashboardResponseDto,
  seededDashboard: SeededDashboardAggregation,
): void {
  const { account, site } = seededDashboard;

  expect(dashboard.organizationId).toBe(account.organization.id);
  expect(dashboard.siteId).toBeNull();
  expect(dashboard.realTimeAvailable).toBe(false);
  expect(dashboard.refreshMode).toBe("http_polling");
  expect(dashboard.stats).toMatchObject({
    accessibleSitesCount: 1,
    activeAlertsCount: 1,
    activeSitesCount: 1,
    activeWorkersCount: 1,
    criticalAlertsCount: 1,
    globalProgressPercent: 60,
    taskCompletedCount: 1,
    taskInProgressCount: 1,
  });
  expect(dashboard.stats.upcomingDeadlinesCount).toBeGreaterThanOrEqual(3);
  expectDashboardSiteAggregation(dashboard, site);
  expect(dashboard.alerts).toHaveLength(1);
  expect(dashboard.alerts[0]).toMatchObject({
    severity: "critical",
    siteId: site.id,
    type: "delay_risk",
  });
  expect(dashboard.upcomingDeadlines[0]?.dueDate).toBe("2026-07-08");
  expect(dashboard.emptyState).toBeNull();
}

function expectDashboardSiteAggregation(
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
    name: "Résidence Horizon",
    progressPercent: 60,
    taskCompletedCount: 1,
    taskInProgressCount: 1,
    taskTotalCount: 3,
  });
  expect(dashboard.navigationShortcuts).toStrictEqual([
    {
      description: "Accéder au détail du chantier.",
      label: "Ouvrir Résidence Horizon",
      path: `/sites/${site.id}`,
      siteId: site.id,
      type: "site_details",
    },
  ]);
  expect(dashboard.dataSources).toContainEqual({
    key: "real_time_events",
    label: "Mise à jour temps réel",
    message: "Flux temps réel non connecté, réponse prête pour rafraîchissement HTTP.",
    status: "unavailable",
  });
}
