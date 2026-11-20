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
  type CreatedTask,
  createTaskForPhase,
  findPhaseWorkerAssignments,
} from "./resource-assignments-test-helpers.js";
import type {
  PhaseWorkerAssignmentsResponseDto,
  WorkerAssignedTasksResponseDto,
} from "./resource-assignments.dto.js";

const createdOrganizationIds = new Set<string>();
let app: INestApplication<Server>;
let databaseService: DatabaseService;

interface AcceptanceTaskFixtures {
  readonly foundationsTask: CreatedTask;
  readonly structureTask: CreatedTask;
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

it("valide le parcours CDC complet d'assignation des ressources", async () => {
  const account = await createChefWorkerAccount();
  const site = await createSite(account);
  await setSiteMemberRoles(databaseService, site.id, account.response.user.id, [
    "chef_chantier",
    "ouvrier",
  ]);
  const foundationsPhase = await createPhase(account, site.id, "Fondations");
  const structurePhase = await createPhase(account, site.id, "Structure");
  const hiddenPhase = await createPhase(account, site.id, "Hors affectation");
  const secondWorker = await createWorkerOnSite(account.response.organization.id, site.id);
  const { foundationsTask, structureTask } = await createAcceptanceTasks({
    account,
    foundationsPhase,
    hiddenPhase,
    site,
    structurePhase,
  });

  const firstAssignments = await assignWorkers(account, site.id, foundationsPhase.id, [
    account.response.user.id,
    secondWorker.id,
  ]);
  await assignWorkers(account, site.id, structurePhase.id, [account.response.user.id]);

  expect(firstAssignments.assignments.map((assignment) => assignment.workerUserId).sort()).toEqual(
    [account.response.user.id, secondWorker.id].sort(),
  );
  expect(await findPhaseWorkerAssignments(databaseService, foundationsPhase.id)).toHaveLength(2);
  expect(await findPhaseWorkerAssignments(databaseService, structurePhase.id)).toHaveLength(1);
  expect(await countWorkerPhaseAssignments(databaseService, account.response.user.id)).toBe(2);

  const listResponse = await request(getHttpServer())
    .get(`/api/sites/${site.id}/phases/${foundationsPhase.id}/worker-assignments`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .expect(200);
  const listedAssignments = parsePhaseWorkerAssignmentsResponse(listResponse);

  expect(listedAssignments.assignments).toHaveLength(2);
  expect(listedAssignments.assignments.map((assignment) => assignment.workerUserId).sort()).toEqual(
    [account.response.user.id, secondWorker.id].sort(),
  );

  const tasksResponse = await request(getHttpServer())
    .get(`/api/sites/${site.id}/my-tasks`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .expect(200);
  const assignedTasks = parseWorkerAssignedTasksResponse(tasksResponse);

  expect(assignedTasks.workerUserId).toBe(account.response.user.id);
  expect(assignedTasks.tasks).toStrictEqual([
    {
      description: null,
      dueDate: "2026-07-10",
      id: foundationsTask.id,
      phaseId: foundationsPhase.id,
      phaseName: "Fondations",
      siteId: site.id,
      status: "todo",
      title: "Préparer les fondations",
    },
    {
      description: null,
      dueDate: "2026-07-12",
      id: structureTask.id,
      phaseId: structurePhase.id,
      phaseName: "Structure",
      siteId: site.id,
      status: "todo",
      title: "Monter la structure",
    },
  ]);
});

it("valide les erreurs de donnees invalides sans persister d'affectation", async () => {
  const account = await createChefWorkerAccount();
  const site = await createSite(account);
  const phase = await createPhase(account, site.id, "Phase validation recette");

  const response = await request(getHttpServer())
    .post(`/api/sites/${site.id}/phases/${phase.id}/worker-assignments`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ workerUserIds: [account.response.user.id, account.response.user.id] })
    .expect(400);

  expect(parseApiErrorResponse(response).message).toContain(
    "Chaque ouvrier ne peut être sélectionné qu'une seule fois.",
  );
  expect(await findPhaseWorkerAssignments(databaseService, phase.id)).toHaveLength(0);
});

it("valide les refus par role et l'isolation entre organisations", async () => {
  const accountA = await createChefWorkerAccount();
  const accountB = await createChefWorkerAccount();
  const siteA = await createSite(accountA);
  const phaseA = await createPhase(accountA, siteA.id, "Phase isolée");
  const workerA = await createWorkerOnSite(accountA.response.organization.id, siteA.id);

  await setUserRoles(databaseService, accountA.response.user.id, ["ouvrier"]);
  const forbiddenResponse = await request(getHttpServer())
    .post(`/api/sites/${siteA.id}/phases/${phaseA.id}/worker-assignments`)
    .set("Authorization", `Bearer ${accountA.response.accessToken}`)
    .send({ workerUserIds: [workerA.id] })
    .expect(403);

  expect(parseApiErrorResponse(forbiddenResponse).message).toContain(
    "Vous n'avez pas le rôle requis pour cette action.",
  );

  const isolatedResponse = await request(getHttpServer())
    .post(`/api/sites/${siteA.id}/phases/${phaseA.id}/worker-assignments`)
    .set("Authorization", `Bearer ${accountB.response.accessToken}`)
    .send({ workerUserIds: [accountB.response.user.id] })
    .expect(404);

  expect(parseApiErrorResponse(isolatedResponse).message).toContain("Le chantier est introuvable.");
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

async function createChefWorkerAccount(): Promise<RegisteredTestAccount> {
  const account = await createRegisteredAccount();
  await setUserRoles(databaseService, account.response.user.id, ["chef_chantier", "ouvrier"]);

  return account;
}

async function createSite(account: RegisteredTestAccount): Promise<SiteResponseDto> {
  const response = await request(getHttpServer())
    .post("/api/sites")
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ name: "Chantier Recette Ressources" })
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

async function createAcceptanceTasks(input: {
  readonly account: RegisteredTestAccount;
  readonly foundationsPhase: PhaseResponseDto;
  readonly hiddenPhase: PhaseResponseDto;
  readonly site: SiteResponseDto;
  readonly structurePhase: PhaseResponseDto;
}): Promise<AcceptanceTaskFixtures> {
  const foundationsTask = await createTaskForPhase(databaseService, {
    createdBy: input.account.response.user.id,
    dueDate: "2026-07-10",
    phaseId: input.foundationsPhase.id,
    siteId: input.site.id,
    title: "Préparer les fondations",
  });
  const structureTask = await createTaskForPhase(databaseService, {
    createdBy: input.account.response.user.id,
    dueDate: "2026-07-12",
    phaseId: input.structurePhase.id,
    siteId: input.site.id,
    title: "Monter la structure",
  });

  await createTaskForPhase(databaseService, {
    createdBy: input.account.response.user.id,
    dueDate: "2026-07-14",
    phaseId: input.hiddenPhase.id,
    siteId: input.site.id,
    title: "Tâche non assignée",
  });

  return { foundationsTask, structureTask };
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

function parseWorkerAssignedTasksResponse(response: Response): WorkerAssignedTasksResponseDto {
  return JSON.parse(response.text) as WorkerAssignedTasksResponseDto;
}
