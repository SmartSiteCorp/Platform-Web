import type { Server } from "node:http";
import request from "supertest";

import type { RegisterResponseDto } from "../auth/auth.dto.js";
import type { DatabaseService } from "../database/database.service.js";
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

export interface DroneDashboardAcceptanceFixture {
  readonly account: RegisterResponseDto;
  readonly activeDroneId: string;
  readonly activeMissionId: string;
  readonly plannedDroneId: string;
  readonly plannedMissionId: string;
  readonly site: SiteResponseDto;
}

export async function createDroneDashboardAcceptanceAccount(
  httpServer: Server,
  createdOrganizationIds: Set<string>,
): Promise<RegisterResponseDto> {
  return createDashboardTestAccount(httpServer, createdOrganizationIds);
}

export async function deleteDroneDashboardAcceptanceArtifacts(
  databaseService: DatabaseService,
  createdOrganizationIds: Set<string>,
): Promise<void> {
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

export async function seedDroneDashboardAcceptanceFixture(
  databaseService: DatabaseService,
  httpServer: Server,
  createdOrganizationIds: Set<string>,
): Promise<DroneDashboardAcceptanceFixture> {
  const account = await createDroneDashboardAcceptanceAccount(httpServer, createdOrganizationIds);
  const site = await createDashboardSite(httpServer, account, { name: "Base Drone Recette" });

  await switchAccountRoles(databaseService, account, ["droniste"]);
  await authorizeDroneSite(databaseService, account, site);

  const activeDroneId = await createDashboardDroneDevice(databaseService, account.organization.id, {
    name: "Drone Connecté Recette",
  });
  const plannedDroneId = await createDashboardDroneDevice(
    databaseService,
    account.organization.id,
    {
      name: "Drone Standby Recette",
    },
  );
  const activeMissionId = await createDashboardDroneMission(
    databaseService,
    site.id,
    account.user.id,
    {
      missionDate: "2026-07-06T08:00:00.000Z",
      status: "in_progress",
      telemetry: { batteryPercent: 18, connectionStatus: "connected" },
    },
  );
  const plannedMissionId = await createDashboardDroneMission(
    databaseService,
    site.id,
    account.user.id,
    {
      missionDate: "2026-07-07T09:30:00.000Z",
      status: "planned",
      telemetry: { batteryPercent: 72, connectionStatus: "standby" },
    },
  );

  await createDashboardDroneFlight(
    databaseService,
    activeMissionId,
    account.user.id,
    activeDroneId,
    {
      name: "Vol inspection toiture",
      status: "in_progress",
    },
  );
  await createDashboardDroneFlight(
    databaseService,
    plannedMissionId,
    account.user.id,
    plannedDroneId,
    { name: "Vol façade sud", status: "planned" },
  );

  return { account, activeDroneId, activeMissionId, plannedDroneId, plannedMissionId, site };
}

export async function authorizeDroneSite(
  databaseService: DatabaseService,
  account: RegisterResponseDto,
  site: SiteResponseDto,
): Promise<void> {
  await setDashboardSiteMemberRoles(databaseService, site.id, account.user.id, ["droniste"]);
}

export async function seedSingleDroneMission(
  databaseService: DatabaseService,
  account: RegisterResponseDto,
  site: SiteResponseDto,
  droneName: string,
): Promise<void> {
  const droneId = await createDashboardDroneDevice(databaseService, account.organization.id, {
    name: droneName,
  });
  const missionId = await createDashboardDroneMission(databaseService, site.id, account.user.id, {
    status: "planned",
    telemetry: { batteryPercent: 80, connectionStatus: "standby" },
  });

  await createDashboardDroneFlight(databaseService, missionId, account.user.id, droneId);
}

export async function getDroneDashboard(
  httpServer: Server,
  account: RegisterResponseDto,
): Promise<DroneOperatorDashboardResponseDto> {
  const response = await request(httpServer)
    .get("/api/dashboard/drone-operator")
    .set("Authorization", `Bearer ${account.accessToken}`)
    .expect(200);

  return parseDroneOperatorDashboardResponse(response);
}
