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
  createDashboardSite,
  createDashboardTestAccount,
  switchAccountRoles,
} from "./dashboard-test-helpers.js";
import {
  createDashboardDroneDevice,
  createDashboardDroneFlight,
  createDashboardDroneMission,
  findLatestDroneDashboardAuditLog,
  setDashboardSiteMemberRoles,
} from "./drone-operator-dashboard-test-helpers.js";

const createdOrganizationIds = new Set<string>();
let app: INestApplication<Server>;
let databaseService: DatabaseService;

interface SeededDroneDashboardSecurity {
  readonly account: RegisterResponseDto;
  readonly droneName: string;
  readonly flightName: string;
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
  await deleteDroneDashboardArtifacts();
  await deleteCreatedOrganizations(databaseService, createdOrganizationIds);
  createdOrganizationIds.clear();
});

afterAll(async () => {
  await app.close();
});

it("protege le dashboard droniste par authentification JWT", async () => {
  const response = await request(getHttpServer()).get("/api/dashboard/drone-operator").expect(401);
  const responseBody = parseApiErrorResponse(response);
  const serializedResponse = JSON.stringify(responseBody);

  expect(serializedResponse).not.toContain("accessToken");
  expect(serializedResponse).not.toContain("password");
});

it("journalise l'acces dashboard droniste sans exposer de donnees sensibles", async () => {
  const seededDashboard = await seedDroneDashboardSecurity();
  await request(getHttpServer())
    .get(`/api/dashboard/drone-operator?siteId=${seededDashboard.site.id}`)
    .set("Authorization", `Bearer ${seededDashboard.account.accessToken}`)
    .expect(200);
  const auditLog = await findLatestDroneDashboardAuditLog(
    databaseService,
    seededDashboard.account.organization.id,
  );

  expect(auditLog).not.toBeNull();
  expect(auditLog?.action).toBe("dashboard.drone_operator_viewed");
  expect(auditLog?.organization_id).toBe(seededDashboard.account.organization.id);
  expect(auditLog?.actor_user_id).toBe(seededDashboard.account.user.id);
  expect(auditLog?.metadata).toStrictEqual({
    dashboard: "drone_operator",
    siteFilterApplied: true,
    siteId: seededDashboard.site.id,
    visibleDroneCount: 1,
    visibleMissionCount: 1,
    visibleTechnicalAlertCount: 1,
  });
  expectAuditLogIsSafe(auditLog, seededDashboard);
});

function getHttpServer(): Server {
  return app.getHttpServer();
}

async function deleteDroneDashboardArtifacts(): Promise<void> {
  const organizationIds = [...createdOrganizationIds];

  if (organizationIds.length === 0) {
    return;
  }

  await databaseService.query(
    `
      DELETE FROM drone_missions
      USING sites
      WHERE drone_missions.site_id = sites.id
        AND sites.organization_id = ANY($1::uuid[])
    `,
    [organizationIds],
  );
  await databaseService.query("DELETE FROM devices WHERE organization_id = ANY($1::uuid[])", [
    organizationIds,
  ]);
}

async function seedDroneDashboardSecurity(): Promise<SeededDroneDashboardSecurity> {
  const account = await createDashboardTestAccount(getHttpServer(), createdOrganizationIds);
  const site = await createDashboardSite(getHttpServer(), account, {
    name: "Chantier Drone Audit",
  });

  await switchAccountRoles(databaseService, account, ["droniste"]);
  await setDashboardSiteMemberRoles(databaseService, site.id, account.user.id, ["droniste"]);

  const droneName = "Drone Audit Alpha";
  const flightName = "Vol audit batterie";
  const droneId = await createDashboardDroneDevice(databaseService, account.organization.id, {
    name: droneName,
  });
  const missionId = await createDashboardDroneMission(databaseService, site.id, account.user.id, {
    status: "in_progress",
    telemetry: { batteryPercent: 18, connectionStatus: "connected" },
  });

  await createDashboardDroneFlight(databaseService, missionId, account.user.id, droneId, {
    name: flightName,
    status: "in_progress",
  });

  return { account, droneName, flightName, site };
}

function expectAuditLogIsSafe(
  auditLog: Awaited<ReturnType<typeof findLatestDroneDashboardAuditLog>>,
  seededDashboard: SeededDroneDashboardSecurity,
): void {
  const serializedAuditLog = JSON.stringify(auditLog);

  expect(serializedAuditLog).not.toContain(seededDashboard.account.accessToken);
  expect(serializedAuditLog).not.toContain(seededDashboard.account.user.email);
  expect(serializedAuditLog).not.toContain(seededDashboard.site.name);
  expect(serializedAuditLog).not.toContain(seededDashboard.droneName);
  expect(serializedAuditLog).not.toContain(seededDashboard.flightName);
}
