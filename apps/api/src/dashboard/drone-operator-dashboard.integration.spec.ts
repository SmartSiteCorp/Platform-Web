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
  createDashboardSite,
  createDashboardTestAccount,
  switchAccountRoles,
} from "./dashboard-test-helpers.js";
import type { DroneOperatorDashboardResponseDto } from "./drone-operator-dashboard.dto.js";
import {
  createDashboardDroneDevice,
  createDashboardDroneFlight,
  createDashboardDroneMission,
  parseDroneOperatorDashboardResponse,
  setDashboardSiteMemberRoles,
} from "./drone-operator-dashboard-test-helpers.js";

const createdOrganizationIds = new Set<string>();
let app: INestApplication<Server>;
let databaseService: DatabaseService;

interface SeededDroneDashboard {
  readonly account: RegisterResponseDto;
  readonly activeMissionId: string;
  readonly droneId: string;
  readonly plannedMissionId: string;
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

it("aggrege les donnees du dashboard droniste", async () => {
  const seededDashboard = await seedDroneDashboard();
  const response = await request(getHttpServer())
    .get("/api/dashboard/drone-operator")
    .set("Authorization", `Bearer ${seededDashboard.account.accessToken}`)
    .expect(200);
  const dashboard = parseDroneOperatorDashboardResponse(response);

  expectDroneDashboardAggregation(dashboard, seededDashboard);
});

it("retourne un etat vide quand aucune mission drone n'est accessible", async () => {
  const account = await createDroneDashboardAccount();
  const response = await request(getHttpServer())
    .get("/api/dashboard/drone-operator")
    .set("Authorization", `Bearer ${account.accessToken}`)
    .expect(200);
  const dashboard = parseDroneOperatorDashboardResponse(response);

  expect(dashboard.stats).toMatchObject({
    activeMissionsCount: 0,
    assignedMissionsCount: 0,
    connectedDronesCount: 0,
    plannedMissionsCount: 0,
    technicalAlertsCount: 0,
  });
  expect(dashboard.drones).toStrictEqual([]);
  expect(dashboard.missions).toStrictEqual([]);
  expect(dashboard.technicalAlerts).toStrictEqual([]);
  expect(dashboard.emptyState).toStrictEqual({
    message: "Aucune mission drone n'est associée à votre compte pour le moment.",
    title: "Aucune mission drone accessible",
  });
});

it("valide le filtre siteId et les permissions du dashboard droniste", async () => {
  const accountA = await createDroneDashboardAccount();
  const accountB = await createDroneDashboardAccount();
  const accessibleSite = await createDashboardSite(getHttpServer(), accountA);
  const forbiddenSite = await createDashboardSite(getHttpServer(), accountA);

  await setDashboardSiteMemberRoles(databaseService, accessibleSite.id, accountA.user.id, [
    "droniste",
  ]);
  await setDashboardSiteMemberRoles(databaseService, forbiddenSite.id, accountA.user.id, []);

  const invalidResponse = await request(getHttpServer())
    .get("/api/dashboard/drone-operator?siteId=not-a-uuid")
    .set("Authorization", `Bearer ${accountA.accessToken}`)
    .expect(400);

  expect(parseApiErrorResponse(invalidResponse).message).toContain(
    "Le chantier doit être identifié par un UUID valide.",
  );

  const missingResponse = await request(getHttpServer())
    .get(`/api/dashboard/drone-operator?siteId=${randomUUID()}`)
    .set("Authorization", `Bearer ${accountA.accessToken}`)
    .expect(404);

  expect(parseApiErrorResponse(missingResponse).message).toContain("Le chantier est introuvable.");

  const forbiddenResponse = await request(getHttpServer())
    .get(`/api/dashboard/drone-operator?siteId=${forbiddenSite.id}`)
    .set("Authorization", `Bearer ${accountA.accessToken}`)
    .expect(403);

  expect(parseApiErrorResponse(forbiddenResponse).message).toContain(
    "Vous n'avez pas accès à ce chantier.",
  );

  const isolatedResponse = await request(getHttpServer())
    .get(`/api/dashboard/drone-operator?siteId=${accessibleSite.id}`)
    .set("Authorization", `Bearer ${accountB.accessToken}`)
    .expect(404);

  expect(parseApiErrorResponse(isolatedResponse).message).toContain("Le chantier est introuvable.");
});

it("refuse les utilisateurs sans role droniste", async () => {
  const account = await createDashboardTestAccount(getHttpServer(), createdOrganizationIds);

  await switchAccountRoles(databaseService, account, ["ouvrier"]);

  const response = await request(getHttpServer())
    .get("/api/dashboard/drone-operator")
    .set("Authorization", `Bearer ${account.accessToken}`)
    .expect(403);

  expect(parseApiErrorResponse(response).message).toContain(
    "Vous n'avez pas le rôle requis pour cette action.",
  );
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

async function createDroneDashboardAccount(): Promise<RegisterResponseDto> {
  const account = await createDashboardTestAccount(getHttpServer(), createdOrganizationIds);
  await switchAccountRoles(databaseService, account, ["chef_chantier", "droniste"]);

  return account;
}

async function seedDroneDashboard(): Promise<SeededDroneDashboard> {
  const account = await createDroneDashboardAccount();
  const site = await createDashboardSite(getHttpServer(), account, {
    name: "Chantier Drone Recette",
  });
  await setDashboardSiteMemberRoles(databaseService, site.id, account.user.id, ["droniste"]);
  const droneId = await createDashboardDroneDevice(databaseService, account.organization.id, {
    name: "Drone Alpha",
  });
  const activeMissionId = await createDashboardDroneMission(
    databaseService,
    site.id,
    account.user.id,
    {
      missionDate: "2026-07-04T08:00:00.000Z",
      status: "in_progress",
      telemetry: { batteryPercent: 18, connectionStatus: "connected" },
    },
  );
  await createDashboardDroneFlight(databaseService, activeMissionId, account.user.id, droneId, {
    name: "Vol façade nord",
    status: "in_progress",
  });
  const plannedMissionId = await createDashboardDroneMission(
    databaseService,
    site.id,
    account.user.id,
    {
      missionDate: "2026-07-05T09:00:00.000Z",
      status: "planned",
      telemetry: { batteryPercent: 78, connectionStatus: "standby" },
    },
  );

  return { account, activeMissionId, droneId, plannedMissionId, site };
}

function expectDroneDashboardAggregation(
  dashboard: DroneOperatorDashboardResponseDto,
  seededDashboard: SeededDroneDashboard,
): void {
  expect(dashboard.organizationId).toBe(seededDashboard.account.organization.id);
  expect(dashboard.siteId).toBeNull();
  expect(dashboard.realTimeAvailable).toBe(false);
  expect(dashboard.refreshMode).toBe("http_polling");
  expect(dashboard.stats).toMatchObject({
    activeMissionsCount: 1,
    assignedMissionsCount: 2,
    averageBatteryPercent: 18,
    connectedDronesCount: 1,
    plannedMissionsCount: 1,
    technicalAlertsCount: 1,
  });
  expect(dashboard.missions.map((mission) => mission.id)).toStrictEqual([
    seededDashboard.activeMissionId,
    seededDashboard.plannedMissionId,
  ]);
  expect(dashboard.drones).toStrictEqual([
    {
      batteryPercent: 18,
      connectionStatus: "connected",
      currentMissionId: seededDashboard.activeMissionId,
      currentMissionStatus: "in_progress",
      detailsPath: `/drone/devices/${seededDashboard.droneId}`,
      id: seededDashboard.droneId,
      name: "Drone Alpha",
    },
  ]);
  expect(dashboard.technicalAlerts[0]).toMatchObject({
    droneId: seededDashboard.droneId,
    missionId: seededDashboard.activeMissionId,
    severity: "warning",
    siteId: seededDashboard.site.id,
    type: "battery_low",
  });
  expect(dashboard.navigationShortcuts[0]).toMatchObject({
    label: "Ouvrir mission Chantier Drone Recette",
    missionId: seededDashboard.activeMissionId,
    type: "mission_details",
  });
  expect(dashboard.dataSources).toContainEqual({
    key: "real_time_telemetry",
    label: "Télémétrie temps réel",
    message: "Flux temps réel non connecté, réponse prête pour rafraîchissement HTTP.",
    status: "unavailable",
  });
  expect(dashboard.emptyState).toBeNull();
}
