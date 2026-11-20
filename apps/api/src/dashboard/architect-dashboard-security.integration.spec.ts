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
import { parseApiErrorResponse } from "../organizations/organizations-test-helpers.js";
import type { SiteResponseDto } from "../sites/sites.dto.js";
import {
  createArchitectAnnotation,
  createArchitectBimModel,
  createArchitectIfcFile,
  findLatestArchitectDashboardAuditLog,
  parseArchitectDashboardResponse,
  setArchitectSiteMemberRoles,
} from "./architect-dashboard-test-helpers.js";
import {
  createDashboardAiAlert,
  createDashboardSite,
  createDashboardTestAccount,
  switchAccountRoles,
} from "./dashboard-test-helpers.js";

const createdOrganizationIds = new Set<string>();
let app: INestApplication<Server>;
let databaseService: DatabaseService;

interface SeededArchitectSecurityDashboard {
  readonly account: RegisterResponseDto;
  readonly anomalyDescription: string;
  readonly annotationComment: string;
  readonly annotationTitle: string;
  readonly ifcFileName: string;
  readonly site: SiteResponseDto;
}

interface SeededArchitectTenantDashboard {
  readonly account: RegisterResponseDto;
  readonly anomalyId: string;
  readonly annotationId: string;
  readonly ifcFileId: string;
  readonly ifcFileName: string;
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

it("protege le dashboard architecte par authentification JWT", async () => {
  const response = await request(getHttpServer()).get("/api/dashboard/architect").expect(401);
  const responseBody = parseApiErrorResponse(response);
  const serializedResponse = JSON.stringify(responseBody);

  expect(serializedResponse).not.toContain("accessToken");
  expect(serializedResponse).not.toContain("password");
});

it("journalise l'acces dashboard architecte sans exposer de donnees sensibles", async () => {
  const seededDashboard = await seedArchitectDashboardSecurity();

  await request(getHttpServer())
    .get(`/api/dashboard/architect?siteId=${seededDashboard.site.id}`)
    .set("Authorization", `Bearer ${seededDashboard.account.accessToken}`)
    .expect(200);

  const auditLog = await findLatestArchitectDashboardAuditLog(
    databaseService,
    seededDashboard.account.organization.id,
  );

  expect(auditLog).not.toBeNull();
  expect(auditLog?.action).toBe("dashboard.architect_viewed");
  expect(auditLog?.organization_id).toBe(seededDashboard.account.organization.id);
  expect(auditLog?.actor_user_id).toBe(seededDashboard.account.user.id);
  expect(auditLog?.metadata).toStrictEqual({
    dashboard: "architect",
    siteFilterApplied: true,
    siteId: seededDashboard.site.id,
    visibleAiAnomalyCount: 1,
    visibleIfcModelCount: 1,
    visibleProjectCount: 1,
  });
  expectAuditLogIsSafe(auditLog, seededDashboard);
});

it("isole les projets BIM entre organisations", async () => {
  const tenantA = await seedTenantArchitectDashboard("Tenant A");
  const tenantB = await seedTenantArchitectDashboard("Tenant B");

  const response = await request(getHttpServer())
    .get("/api/dashboard/architect")
    .set("Authorization", `Bearer ${tenantA.account.accessToken}`)
    .expect(200);
  const dashboard = parseArchitectDashboardResponse(response);
  const serializedDashboard = JSON.stringify(dashboard);

  expect(dashboard.organizationId).toBe(tenantA.account.organization.id);
  expect(dashboard.projects).toHaveLength(1);
  expect(dashboard.projects[0]?.id).toBe(tenantA.site.id);
  expect(serializedDashboard).toContain(tenantA.ifcFileName);
  expect(serializedDashboard).not.toContain(tenantB.account.organization.id);
  expect(serializedDashboard).not.toContain(tenantB.site.id);
  expect(serializedDashboard).not.toContain(tenantB.site.name);
  expect(serializedDashboard).not.toContain(tenantB.ifcFileId);
  expect(serializedDashboard).not.toContain(tenantB.ifcFileName);
  expect(serializedDashboard).not.toContain(tenantB.ifcModelId);
  expect(serializedDashboard).not.toContain(tenantB.annotationId);
  expect(serializedDashboard).not.toContain(tenantB.anomalyId);
});

function getHttpServer(): Server {
  return app.getHttpServer();
}

async function seedArchitectDashboardSecurity(): Promise<SeededArchitectSecurityDashboard> {
  const account = await createDashboardTestAccount(getHttpServer(), createdOrganizationIds);
  const site = await createDashboardSite(getHttpServer(), account, {
    name: "Projet Architecte Audit",
  });
  const anomalyDescription = "Écart audit sensible entre scan et modèle.";
  const annotationComment = "Commentaire interne audit architecte.";
  const annotationTitle = "Annotation audit sensible";
  const ifcFileName = "modele-audit-confidentiel.ifc";

  await switchAccountRoles(databaseService, account, ["architecte"]);
  await setArchitectSiteMemberRoles(databaseService, site.id, account.user.id, ["architecte"]);

  const ifcFileId = await createArchitectIfcFile(
    databaseService,
    account.organization.id,
    site.id,
    account.user.id,
    { originalName: ifcFileName },
  );
  const ifcModelId = await createArchitectBimModel(
    databaseService,
    site.id,
    account.user.id,
    ifcFileId,
  );
  await createArchitectAnnotation(databaseService, site.id, account.user.id, ifcModelId, {
    comment: annotationComment,
    title: annotationTitle,
  });
  await createDashboardAiAlert(databaseService, site.id, {
    description: anomalyDescription,
    recommendation: "Recommandation audit interne.",
    severity: "critical",
    type: "bim_discrepancy",
  });

  return {
    account,
    anomalyDescription,
    annotationComment,
    annotationTitle,
    ifcFileName,
    site,
  };
}

async function seedTenantArchitectDashboard(
  suffix: string,
): Promise<SeededArchitectTenantDashboard> {
  const account = await createDashboardTestAccount(getHttpServer(), createdOrganizationIds);
  const site = await createDashboardSite(getHttpServer(), account, {
    name: `Projet Architecte ${suffix}`,
  });

  await switchAccountRoles(databaseService, account, ["architecte"]);
  await setArchitectSiteMemberRoles(databaseService, site.id, account.user.id, ["architecte"]);

  const ifcFileName = `modele-${suffix.toLowerCase().replaceAll(" ", "-")}.ifc`;
  const ifcFileId = await createArchitectIfcFile(
    databaseService,
    account.organization.id,
    site.id,
    account.user.id,
    { originalName: ifcFileName },
  );
  const ifcModelId = await createArchitectBimModel(
    databaseService,
    site.id,
    account.user.id,
    ifcFileId,
    { version: `v-${suffix}` },
  );
  const annotationId = await createArchitectAnnotation(
    databaseService,
    site.id,
    account.user.id,
    ifcModelId,
    { title: `Annotation ${suffix}` },
  );
  const anomalyId = await createDashboardAiAlert(databaseService, site.id, {
    description: `Anomalie ${suffix}`,
    type: "bim_discrepancy",
  });

  return { account, anomalyId, annotationId, ifcFileId, ifcFileName, ifcModelId, site };
}

function expectAuditLogIsSafe(
  auditLog: Awaited<ReturnType<typeof findLatestArchitectDashboardAuditLog>>,
  seededDashboard: SeededArchitectSecurityDashboard,
): void {
  const serializedAuditLog = JSON.stringify(auditLog);

  expect(serializedAuditLog).not.toContain(seededDashboard.account.accessToken);
  expect(serializedAuditLog).not.toContain(seededDashboard.account.user.email);
  expect(serializedAuditLog).not.toContain(seededDashboard.site.name);
  expect(serializedAuditLog).not.toContain(seededDashboard.ifcFileName);
  expect(serializedAuditLog).not.toContain(seededDashboard.annotationTitle);
  expect(serializedAuditLog).not.toContain(seededDashboard.annotationComment);
  expect(serializedAuditLog).not.toContain(seededDashboard.anomalyDescription);
}
