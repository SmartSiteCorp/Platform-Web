import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { Server } from "node:http";
import request from "supertest";
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
  findPhaseWorkerAssignments,
  findResourceAssignmentAuditLog,
} from "./resource-assignments-test-helpers.js";

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

it("protege toutes les routes d'assignation par authentification JWT", async () => {
  const account = await createChefChantierAccount();
  const site = await createSite(account);
  const phase = await createPhase(account, site.id);
  const worker = await createWorkerOnSite(account.response.organization.id, site.id);

  await request(getHttpServer())
    .post(`/api/sites/${site.id}/phases/${phase.id}/worker-assignments`)
    .send({ workerUserIds: [worker.id] })
    .expect(401);
  await request(getHttpServer())
    .get(`/api/sites/${site.id}/phases/${phase.id}/worker-assignments`)
    .expect(401);
  await request(getHttpServer()).get(`/api/sites/${site.id}/assignable-workers`).expect(401);
  await request(getHttpServer()).get(`/api/sites/${site.id}/my-tasks`).expect(401);
  expect(await findPhaseWorkerAssignments(databaseService, phase.id)).toHaveLength(0);
});

it("refuse un chef de chantier sans appartenance au chantier", async () => {
  const account = await createChefChantierAccount();
  const site = await createSite(account);
  const phase = await createPhase(account, site.id);
  const worker = await createWorkerOnSite(account.response.organization.id, site.id);
  await setSiteMemberRoles(databaseService, site.id, account.response.user.id, []);

  const response = await request(getHttpServer())
    .post(`/api/sites/${site.id}/phases/${phase.id}/worker-assignments`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ workerUserIds: [worker.id] })
    .expect(403);

  expect(parseApiErrorResponse(response).message).toContain("Vous n'avez pas accès à ce chantier.");
  expect(await findPhaseWorkerAssignments(databaseService, phase.id)).toHaveLength(0);
});

it("refuse un membre du chantier avec un role chantier insuffisant", async () => {
  const account = await createChefChantierAccount();
  const site = await createSite(account);
  const phase = await createPhase(account, site.id);
  const worker = await createWorkerOnSite(account.response.organization.id, site.id);
  await setSiteMemberRoles(databaseService, site.id, account.response.user.id, ["ouvrier"]);

  const response = await request(getHttpServer())
    .get(`/api/sites/${site.id}/assignable-workers`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .expect(403);

  expect(parseApiErrorResponse(response).message).toContain("Vous n'avez pas accès à ce chantier.");

  await request(getHttpServer())
    .post(`/api/sites/${site.id}/phases/${phase.id}/worker-assignments`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ workerUserIds: [worker.id] })
    .expect(403);
  expect(await findPhaseWorkerAssignments(databaseService, phase.id)).toHaveLength(0);
});

it("masque les affectations et ouvriers d'une autre organisation", async () => {
  const accountA = await createChefChantierAccount();
  const accountB = await createChefChantierAccount();
  const siteA = await createSite(accountA);
  const phaseA = await createPhase(accountA, siteA.id);
  const workerA = await createWorkerOnSite(accountA.response.organization.id, siteA.id);
  await assignWorkers(accountA, siteA.id, phaseA.id, [workerA.id]);

  await request(getHttpServer())
    .get(`/api/sites/${siteA.id}/assignable-workers`)
    .set("Authorization", `Bearer ${accountB.response.accessToken}`)
    .expect(404);
  await request(getHttpServer())
    .get(`/api/sites/${siteA.id}/phases/${phaseA.id}/worker-assignments`)
    .set("Authorization", `Bearer ${accountB.response.accessToken}`)
    .expect(404);
});

it("refuse la consultation des taches a un ouvrier hors chantier", async () => {
  const account = await createChefChantierAccount();
  await setUserRoles(databaseService, account.response.user.id, ["chef_chantier", "ouvrier"]);
  const site = await createSite(account);
  await setSiteMemberRoles(databaseService, site.id, account.response.user.id, ["chef_chantier"]);

  const response = await request(getHttpServer())
    .get(`/api/sites/${site.id}/my-tasks`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .expect(403);

  expect(parseApiErrorResponse(response).message).toContain("Vous n'avez pas accès à ce chantier.");
});

it("journalise l'assignation sans exposer les ouvriers ou secrets", async () => {
  const account = await createChefChantierAccount();
  const site = await createSite(account);
  const phase = await createPhase(account, site.id);
  const worker = await createWorkerOnSite(account.response.organization.id, site.id);

  await assignWorkers(account, site.id, phase.id, [worker.id]);
  const auditLog = await findResourceAssignmentAuditLog(databaseService, phase.id);
  const serializedLog = JSON.stringify(auditLog);

  expect(auditLog?.metadata).toStrictEqual({
    assignedCount: 1,
    phaseId: phase.id,
    siteId: site.id,
  });
  expect(serializedLog).not.toContain(worker.id);
  expect(serializedLog).not.toContain(account.response.accessToken);
  expect(serializedLog).not.toContain(account.request.password);
  expect(serializedLog).not.toContain(account.request.email);
});

it("ne duplique pas une affectation deja enregistree", async () => {
  const account = await createChefChantierAccount();
  const site = await createSite(account);
  const phase = await createPhase(account, site.id);
  const worker = await createWorkerOnSite(account.response.organization.id, site.id);

  await assignWorkers(account, site.id, phase.id, [worker.id]);
  await assignWorkers(account, site.id, phase.id, [worker.id]);

  expect(await findPhaseWorkerAssignments(databaseService, phase.id)).toHaveLength(1);
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
    .send({ name: "Chantier Ressources Sécurité" })
    .expect(201);

  return JSON.parse(response.text) as SiteResponseDto;
}

async function createPhase(
  account: RegisteredTestAccount,
  siteId: string,
): Promise<PhaseResponseDto> {
  const response = await request(getHttpServer())
    .post(`/api/sites/${siteId}/phases`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ estimatedDurationDays: 10, name: "Phase sécurité" })
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
): Promise<void> {
  await request(getHttpServer())
    .post(`/api/sites/${siteId}/phases/${phaseId}/worker-assignments`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ workerUserIds })
    .expect(201);
}
