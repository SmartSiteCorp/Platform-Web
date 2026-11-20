import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { Server } from "node:http";
import request, { type Response } from "supertest";
import { afterAll, afterEach, beforeAll, expect, it } from "vitest";

import { configureHttpApp } from "../app-http.js";
import { AppModule } from "../app.module.js";
import { DatabaseService } from "../database/database.service.js";
import { deleteCreatedOrganizations } from "../organizations/organization-invitations-test-helpers.js";
import {
  createOrganizationUser,
  type CreatedOrganizationUser,
} from "../organizations/organization-user-management-test-helpers.js";
import {
  createRegisterRequest,
  parseApiErrorResponse,
  parseRegisterResponse,
  type RegisteredTestAccount,
} from "../organizations/organizations-test-helpers.js";
import { setUserRoles } from "../sites/sites-test-helpers.js";
import type { SiteResponseDto } from "../sites/sites.dto.js";
import { setSiteMemberRoles } from "./phases-test-helpers.js";
import type { PhaseResponseDto } from "./phases.dto.js";
import {
  countWorkerPhaseAssignments,
  createTaskForPhase,
  findPhaseWorkerAssignments,
  findResourceAssignmentAuditLog,
} from "./resource-assignments-test-helpers.js";
import type {
  AssignableWorkersResponseDto,
  PhaseWorkerAssignmentsResponseDto,
  WorkerAssignedTasksResponseDto,
} from "./resource-assignments.dto.js";

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

it("assigne des ouvriers a une phase et persiste les affectations", async () => {
  const account = await createChefChantierAccount();
  const site = await createSite(account);
  const phase = await createPhase(account, site.id, "Gros œuvre");
  const workerA = await createWorkerOnSite(account.response.organization.id, site.id);
  const workerB = await createWorkerOnSite(account.response.organization.id, site.id);

  const response = await request(getHttpServer())
    .post(`/api/sites/${site.id}/phases/${phase.id}/worker-assignments`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ workerUserIds: [workerA.id, workerB.id] })
    .expect(201);
  const responseBody = parsePhaseWorkerAssignmentsResponse(response);

  expect(responseBody.siteId).toBe(site.id);
  expect(responseBody.phaseId).toBe(phase.id);
  expect(
    responseBody.assignments.map((assignment) => assignment.workerUserId).sort(),
  ).toStrictEqual([workerA.id, workerB.id].sort());
  expect(response.text).not.toContain("password");
  expect(response.text).not.toContain("accessToken");
  expect(response.text).not.toContain("@smartsite.test");

  const persistedAssignments = await findPhaseWorkerAssignments(databaseService, phase.id);

  expect(persistedAssignments).toHaveLength(2);
  expect(persistedAssignments.map((assignment) => assignment.worker_user_id).sort()).toStrictEqual(
    [workerA.id, workerB.id].sort(),
  );

  const auditLog = await findResourceAssignmentAuditLog(databaseService, phase.id);

  expect(auditLog).not.toBeNull();
  expect(auditLog?.action).toBe("phase.workers_assigned");
  expect(auditLog?.organization_id).toBe(account.response.organization.id);
  expect(auditLog?.actor_user_id).toBe(account.response.user.id);
  expect(auditLog?.changed_fields).toStrictEqual(["workerUserIds"]);
  expect(auditLog?.metadata).toStrictEqual({
    assignedCount: 2,
    phaseId: phase.id,
    siteId: site.id,
  });
  expect(auditLog?.metadata).not.toHaveProperty("workerUserIds");
});

it("liste les ouvriers assignables au chantier sans donnees sensibles", async () => {
  const account = await createChefChantierAccount();
  const site = await createSite(account);
  const workerA = await createWorkerOnSite(account.response.organization.id, site.id);
  const workerB = await createWorkerOnSite(account.response.organization.id, site.id);
  await createOrganizationUser(databaseService, account.response.organization.id, ["ouvrier"]);

  const response = await request(getHttpServer())
    .get(`/api/sites/${site.id}/assignable-workers`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .expect(200);
  const responseBody = parseAssignableWorkersResponse(response);

  expect(responseBody.siteId).toBe(site.id);
  expect(responseBody.workers.map((worker) => worker.workerUserId).sort()).toStrictEqual(
    [workerA.id, workerB.id].sort(),
  );
  expect(response.text).not.toContain("password");
  expect(response.text).not.toContain("accessToken");
  expect(response.text).not.toContain("@smartsite.test");
});

it("permet a un ouvrier d'etre assigne a plusieurs phases", async () => {
  const account = await createChefChantierAccount();
  const site = await createSite(account);
  const firstPhase = await createPhase(account, site.id, "Fondations");
  const secondPhase = await createPhase(account, site.id, "Second œuvre");
  const worker = await createWorkerOnSite(account.response.organization.id, site.id);

  await assignWorkers(account, site.id, firstPhase.id, [worker.id]);
  await assignWorkers(account, site.id, secondPhase.id, [worker.id]);

  expect(await countWorkerPhaseAssignments(databaseService, worker.id)).toBe(2);
});

it("retourne les taches des phases assignees a l'ouvrier connecte", async () => {
  const account = await createRegisteredAccount();
  await setUserRoles(databaseService, account.response.user.id, ["chef_chantier", "ouvrier"]);
  const site = await createSite(account);
  await setSiteMemberRoles(databaseService, site.id, account.response.user.id, [
    "chef_chantier",
    "ouvrier",
  ]);
  const assignedPhase = await createPhase(account, site.id, "Phase assignée");
  const otherPhase = await createPhase(account, site.id, "Phase non assignée");
  const visibleTask = await createTaskForPhase(databaseService, {
    createdBy: account.response.user.id,
    dueDate: "2026-07-10",
    phaseId: assignedPhase.id,
    siteId: site.id,
    title: "Tâche visible",
  });
  await createTaskForPhase(databaseService, {
    createdBy: account.response.user.id,
    phaseId: otherPhase.id,
    siteId: site.id,
    title: "Tâche masquée",
  });
  await assignWorkers(account, site.id, assignedPhase.id, [account.response.user.id]);

  const response = await request(getHttpServer())
    .get(`/api/sites/${site.id}/my-tasks`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .expect(200);
  const responseBody = parseWorkerAssignedTasksResponse(response);

  expect(responseBody).toStrictEqual({
    siteId: site.id,
    tasks: [
      {
        description: null,
        dueDate: "2026-07-10",
        id: visibleTask.id,
        phaseId: assignedPhase.id,
        phaseName: "Phase assignée",
        siteId: site.id,
        status: "todo",
        title: "Tâche visible",
      },
    ],
    workerUserId: account.response.user.id,
  });
});

it("refuse une assignation sans ouvrier", async () => {
  const account = await createChefChantierAccount();
  const site = await createSite(account);
  const phase = await createPhase(account, site.id, "Phase validation");

  const response = await request(getHttpServer())
    .post(`/api/sites/${site.id}/phases/${phase.id}/worker-assignments`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ workerUserIds: [] })
    .expect(400);

  expect(parseApiErrorResponse(response).message).toContain(
    "Au moins un ouvrier doit être sélectionné.",
  );
  expect(await findPhaseWorkerAssignments(databaseService, phase.id)).toHaveLength(0);
});

it("refuse un utilisateur qui n'est pas ouvrier du chantier", async () => {
  const account = await createChefChantierAccount();
  const site = await createSite(account);
  const phase = await createPhase(account, site.id, "Phase protégée");
  const worker = await createOrganizationUser(databaseService, account.response.organization.id, [
    "ouvrier",
  ]);

  const response = await request(getHttpServer())
    .post(`/api/sites/${site.id}/phases/${phase.id}/worker-assignments`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ workerUserIds: [worker.id] })
    .expect(400);

  expect(parseApiErrorResponse(response).message).toContain(
    "Chaque ouvrier assigné doit être actif, appartenir à l'organisation et au chantier.",
  );
  expect(await findPhaseWorkerAssignments(databaseService, phase.id)).toHaveLength(0);
});

it("refuse l'assignation si l'utilisateur n'a plus le role de gestion", async () => {
  const account = await createChefChantierAccount();
  const site = await createSite(account);
  const phase = await createPhase(account, site.id, "Phase interdite");
  const worker = await createWorkerOnSite(account.response.organization.id, site.id);
  await setUserRoles(databaseService, account.response.user.id, ["ouvrier"]);

  const response = await request(getHttpServer())
    .post(`/api/sites/${site.id}/phases/${phase.id}/worker-assignments`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ workerUserIds: [worker.id] })
    .expect(403);

  expect(parseApiErrorResponse(response).message).toContain(
    "Vous n'avez pas le rôle requis pour cette action.",
  );
  expect(await findPhaseWorkerAssignments(databaseService, phase.id)).toHaveLength(0);
});

it("masque les chantiers d'une autre organisation", async () => {
  const accountA = await createChefChantierAccount();
  const accountB = await createChefChantierAccount();
  const siteA = await createSite(accountA);
  const phaseA = await createPhase(accountA, siteA.id, "Phase organisation A");

  const response = await request(getHttpServer())
    .post(`/api/sites/${siteA.id}/phases/${phaseA.id}/worker-assignments`)
    .set("Authorization", `Bearer ${accountB.response.accessToken}`)
    .send({ workerUserIds: [accountB.response.user.id] })
    .expect(404);

  expect(parseApiErrorResponse(response).message).toContain("Le chantier est introuvable.");
  expect(await findPhaseWorkerAssignments(databaseService, phaseA.id)).toHaveLength(0);
});

function getHttpServer(): Server {
  return app.getHttpServer();
}

async function createRegisteredAccount(): Promise<RegisteredTestAccount> {
  const registrationRequest = createRegisterRequest();
  const response = await request(getHttpServer())
    .post("/api/auth/register")
    .send(registrationRequest)
    .expect(201);
  const responseBody = parseRegisterResponse(response);

  createdOrganizationIds.add(responseBody.organization.id);

  return { request: registrationRequest, response: responseBody };
}

async function createChefChantierAccount(): Promise<RegisteredTestAccount> {
  const account = await createRegisteredAccount();
  await setUserRoles(databaseService, account.response.user.id, ["chef_chantier"]);

  return account;
}

async function createSite(account: RegisteredTestAccount): Promise<SiteResponseDto> {
  const response = await request(getHttpServer())
    .post("/api/sites")
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ name: "Chantier Ressources" })
    .expect(201);

  return JSON.parse(response.text) as SiteResponseDto;
}

async function createPhase(
  account: RegisteredTestAccount,
  siteId: string,
  name: string,
): Promise<PhaseResponseDto> {
  const response = await request(getHttpServer())
    .post(`/api/sites/${siteId}/phases`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ estimatedDurationDays: 10, name })
    .expect(201);

  return JSON.parse(response.text) as PhaseResponseDto;
}

async function createWorkerOnSite(
  organizationId: string,
  siteId: string,
): Promise<CreatedOrganizationUser> {
  const worker = await createOrganizationUser(databaseService, organizationId, ["ouvrier"]);
  await setSiteMemberRoles(databaseService, siteId, worker.id, ["ouvrier"]);

  return worker;
}

async function assignWorkers(
  account: RegisteredTestAccount,
  siteId: string,
  phaseId: string,
  workerUserIds: readonly string[],
): Promise<PhaseWorkerAssignmentsResponseDto> {
  const response = await request(getHttpServer())
    .post(`/api/sites/${siteId}/phases/${phaseId}/worker-assignments`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ workerUserIds })
    .expect(201);

  return parsePhaseWorkerAssignmentsResponse(response);
}

function parsePhaseWorkerAssignmentsResponse(
  response: Response,
): PhaseWorkerAssignmentsResponseDto {
  return JSON.parse(response.text) as PhaseWorkerAssignmentsResponseDto;
}

function parseAssignableWorkersResponse(response: Response): AssignableWorkersResponseDto {
  return JSON.parse(response.text) as AssignableWorkersResponseDto;
}

function parseWorkerAssignedTasksResponse(response: Response): WorkerAssignedTasksResponseDto {
  return JSON.parse(response.text) as WorkerAssignedTasksResponseDto;
}
