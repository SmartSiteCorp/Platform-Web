import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { Server } from "node:http";
import request from "supertest";
import { afterAll, afterEach, beforeAll, expect, it } from "vitest";

import { configureHttpApp } from "../app-http.js";
import { AppModule } from "../app.module.js";
import type { RegisterResponseDto } from "../auth/auth.dto.js";
import { DatabaseService } from "../database/database.service.js";
import { deleteCreatedOrganizations } from "../organizations/organization-invitations-test-helpers.js";
import type { SiteResponseDto } from "../sites/sites.dto.js";
import {
  createDashboardAiAlert,
  createDashboardSite,
  createDashboardTestAccount,
  findLatestDashboardAuditLog,
  parseDashboardResponse,
  switchAccountRoles,
} from "./dashboard-test-helpers.js";

const createdOrganizationIds = new Set<string>();
let app: INestApplication<Server>;
let databaseService: DatabaseService;

interface SeededDashboardSecurity {
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

it("journalise l'acces dashboard sans exposer de donnees sensibles", async () => {
  const seededDashboard = await seedDashboardSecurity();
  const response = await request(getHttpServer())
    .get(`/api/dashboard/site-manager?siteId=${seededDashboard.site.id}`)
    .set("Authorization", `Bearer ${seededDashboard.account.accessToken}`)
    .expect(200);
  const dashboard = parseDashboardResponse(response);
  const auditLog = await findLatestDashboardAuditLog(
    databaseService,
    seededDashboard.account.organization.id,
  );

  expect(auditLog).not.toBeNull();
  expect(auditLog?.action).toBe("dashboard.site_manager_viewed");
  expect(auditLog?.organization_id).toBe(seededDashboard.account.organization.id);
  expect(auditLog?.actor_user_id).toBe(seededDashboard.account.user.id);
  expect(auditLog?.metadata).toStrictEqual({
    dashboard: "site_manager",
    siteFilterApplied: true,
    siteId: seededDashboard.site.id,
    upcomingDeadlineCount: dashboard.upcomingDeadlines.length,
    visibleAlertCount: dashboard.alerts.length,
    visibleSiteCount: dashboard.sites.length,
  });
  expectAuditLogIsSafe(auditLog, seededDashboard);
});

function getHttpServer(): Server {
  return app.getHttpServer();
}

async function seedDashboardSecurity(): Promise<SeededDashboardSecurity> {
  const account = await createDashboardTestAccount(getHttpServer(), createdOrganizationIds);

  await switchAccountRoles(databaseService, account, ["chef_chantier"]);

  const site = await createDashboardSite(getHttpServer(), account, {
    name: "Chantier Audit Dashboard",
  });

  await createDashboardAiAlert(databaseService, site.id);

  return { account, site };
}

function expectAuditLogIsSafe(
  auditLog: Awaited<ReturnType<typeof findLatestDashboardAuditLog>>,
  seededDashboard: SeededDashboardSecurity,
): void {
  const serializedAuditLog = JSON.stringify(auditLog);

  expect(serializedAuditLog).not.toContain(seededDashboard.account.accessToken);
  expect(serializedAuditLog).not.toContain(seededDashboard.account.user.email);
  expect(serializedAuditLog).not.toContain(seededDashboard.site.name);
}
