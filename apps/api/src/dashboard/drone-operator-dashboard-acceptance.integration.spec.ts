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
import { createDashboardSite, switchAccountRoles } from "./dashboard-test-helpers.js";
import {
  authorizeDroneSite,
  createDroneDashboardAcceptanceAccount,
  deleteDroneDashboardAcceptanceArtifacts,
  getDroneDashboard,
  seedDroneDashboardAcceptanceFixture,
  seedSingleDroneMission,
  type DroneDashboardAcceptanceFixture,
} from "./drone-operator-dashboard-acceptance-test-helpers.js";
import type { DroneOperatorDashboardResponseDto } from "./drone-operator-dashboard.dto.js";
import { setDashboardSiteMemberRoles } from "./drone-operator-dashboard-test-helpers.js";

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
  await deleteDroneDashboardAcceptanceArtifacts(databaseService, createdOrganizationIds);
  await deleteCreatedOrganizations(databaseService, createdOrganizationIds);
  createdOrganizationIds.clear();
});

afterAll(async () => {
  await app.close();
});

it("valide la recette CDC du dashboard droniste", async () => {
  const fixture = await seedDroneDashboardAcceptanceFixture(
    databaseService,
    getHttpServer(),
    createdOrganizationIds,
  );
  const dashboard = await getDroneDashboard(getHttpServer(), fixture.account);

  expect(dashboard.organizationId).toBe(fixture.account.organization.id);
  expect(dashboard.siteId).toBeNull();
  expect(dashboard.refreshMode).toBe("http_polling");
  expect(dashboard.refreshIntervalSeconds).toBeGreaterThanOrEqual(15);
  expect(dashboard.realTimeAvailable).toBe(false);
  expect(dashboard.stats).toMatchObject({
    activeMissionsCount: 1,
    assignedMissionsCount: 2,
    averageBatteryPercent: 45,
    connectedDronesCount: 1,
    plannedMissionsCount: 1,
    technicalAlertsCount: 1,
  });
  expectDroneMissionsMeetAcceptanceCriteria(dashboard, fixture);
  expectDroneStatusMeetsAcceptanceCriteria(dashboard, fixture);
  expectDroneAlertsAndNavigationMeetAcceptanceCriteria(dashboard, fixture);
});

it("valide les erreurs d'authentification et de filtre chantier", async () => {
  const account = await createDroneDashboardAcceptanceAccount(
    getHttpServer(),
    createdOrganizationIds,
  );

  await switchAccountRoles(databaseService, account, ["droniste"]);

  await request(getHttpServer()).get("/api/dashboard/drone-operator").expect(401);

  const invalidResponse = await request(getHttpServer())
    .get("/api/dashboard/drone-operator?siteId=chantier-invalide")
    .set("Authorization", `Bearer ${account.accessToken}`)
    .expect(400);

  expect(parseApiErrorResponse(invalidResponse).message).toContain(
    "Le chantier doit être identifié par un UUID valide.",
  );

  const missingResponse = await request(getHttpServer())
    .get(`/api/dashboard/drone-operator?siteId=${randomUUID()}`)
    .set("Authorization", `Bearer ${account.accessToken}`)
    .expect(404);

  expect(parseApiErrorResponse(missingResponse).message).toContain("Le chantier est introuvable.");
});

it("valide les permissions par role, chantier et organisation", async () => {
  const accountA = await createDroneDashboardAcceptanceAccount(
    getHttpServer(),
    createdOrganizationIds,
  );
  const accountB = await createDroneDashboardAcceptanceAccount(
    getHttpServer(),
    createdOrganizationIds,
  );
  const siteA = await createDashboardSite(getHttpServer(), accountA, {
    name: "Chantier Drone Organisation A",
  });
  const siteB = await createDashboardSite(getHttpServer(), accountB, {
    name: "Chantier Drone Organisation B",
  });
  const forbiddenSite = await createDashboardSite(getHttpServer(), accountA, {
    name: "Chantier Drone Sans Accès",
  });

  await switchAccountRoles(databaseService, accountA, ["droniste"]);
  await switchAccountRoles(databaseService, accountB, ["droniste"]);
  await authorizeDroneSite(databaseService, accountA, siteA);
  await authorizeDroneSite(databaseService, accountB, siteB);
  await setDashboardSiteMemberRoles(databaseService, forbiddenSite.id, accountA.user.id, []);
  await seedSingleDroneMission(databaseService, accountA, siteA, "Drone Org A");
  await seedSingleDroneMission(databaseService, accountB, siteB, "Drone Org B");

  const isolatedResponse = await request(getHttpServer())
    .get(`/api/dashboard/drone-operator?siteId=${siteA.id}`)
    .set("Authorization", `Bearer ${accountB.accessToken}`)
    .expect(404);

  expect(parseApiErrorResponse(isolatedResponse).message).toContain("Le chantier est introuvable.");

  const forbiddenResponse = await request(getHttpServer())
    .get(`/api/dashboard/drone-operator?siteId=${forbiddenSite.id}`)
    .set("Authorization", `Bearer ${accountA.accessToken}`)
    .expect(403);

  expect(parseApiErrorResponse(forbiddenResponse).message).toContain(
    "Vous n'avez pas accès à ce chantier.",
  );

  const dashboardB = await getDroneDashboard(getHttpServer(), accountB);
  const serializedDashboardB = JSON.stringify(dashboardB);

  expect(dashboardB.organizationId).toBe(accountB.organization.id);
  expect(dashboardB.missions.map((mission) => mission.siteId)).toStrictEqual([siteB.id]);
  expect(serializedDashboardB).not.toContain(siteA.id);
  expect(serializedDashboardB).not.toContain(siteA.name);

  await switchAccountRoles(databaseService, accountA, ["ouvrier"]);

  const forbiddenRoleResponse = await request(getHttpServer())
    .get(`/api/dashboard/drone-operator?siteId=${siteA.id}`)
    .set("Authorization", `Bearer ${accountA.accessToken}`)
    .expect(403);

  expect(parseApiErrorResponse(forbiddenRoleResponse).message).toContain(
    "Vous n'avez pas le rôle requis pour cette action.",
  );
});

function getHttpServer(): Server {
  return app.getHttpServer();
}

function expectDroneMissionsMeetAcceptanceCriteria(
  dashboard: DroneOperatorDashboardResponseDto,
  fixture: DroneDashboardAcceptanceFixture,
): void {
  expect(dashboard.missions.map((mission) => mission.id)).toStrictEqual([
    fixture.activeMissionId,
    fixture.plannedMissionId,
  ]);
  expect(dashboard.missions[0]).toMatchObject({
    batteryPercent: 18,
    connectionStatus: "connected",
    detailsPath: `/drone/missions/${fixture.activeMissionId}`,
    droneId: fixture.activeDroneId,
    droneName: "Drone Connecté Recette",
    flightName: "Vol inspection toiture",
    siteId: fixture.site.id,
    siteName: "Base Drone Recette",
    status: "in_progress",
  });
  expect(dashboard.missions[1]).toMatchObject({
    batteryPercent: 72,
    connectionStatus: "standby",
    droneId: fixture.plannedDroneId,
    droneName: "Drone Standby Recette",
    flightName: "Vol façade sud",
    status: "planned",
  });
}

function expectDroneStatusMeetsAcceptanceCriteria(
  dashboard: DroneOperatorDashboardResponseDto,
  fixture: DroneDashboardAcceptanceFixture,
): void {
  expect(dashboard.drones).toStrictEqual([
    {
      batteryPercent: 18,
      connectionStatus: "connected",
      currentMissionId: fixture.activeMissionId,
      currentMissionStatus: "in_progress",
      detailsPath: `/drone/devices/${fixture.activeDroneId}`,
      id: fixture.activeDroneId,
      name: "Drone Connecté Recette",
    },
    {
      batteryPercent: 72,
      connectionStatus: "standby",
      currentMissionId: fixture.plannedMissionId,
      currentMissionStatus: "planned",
      detailsPath: `/drone/devices/${fixture.plannedDroneId}`,
      id: fixture.plannedDroneId,
      name: "Drone Standby Recette",
    },
  ]);
}

function expectDroneAlertsAndNavigationMeetAcceptanceCriteria(
  dashboard: DroneOperatorDashboardResponseDto,
  fixture: DroneDashboardAcceptanceFixture,
): void {
  expect(dashboard.technicalAlerts).toHaveLength(1);
  expect(dashboard.technicalAlerts[0]).toMatchObject({
    detailsPath: `/drone/missions/${fixture.activeMissionId}`,
    droneId: fixture.activeDroneId,
    message: "Batterie drone faible (18%).",
    missionId: fixture.activeMissionId,
    severity: "warning",
    siteId: fixture.site.id,
    type: "battery_low",
  });
  expect(dashboard.navigationShortcuts).toContainEqual({
    description: "Accéder au détail de la mission drone.",
    label: "Ouvrir mission Base Drone Recette",
    missionId: fixture.activeMissionId,
    path: `/drone/missions/${fixture.activeMissionId}`,
    siteId: fixture.site.id,
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
