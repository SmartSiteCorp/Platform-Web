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
  createRegisterRequest,
  parseApiErrorResponse,
  parseRegisterResponse,
  type RegisteredTestAccount,
} from "../organizations/organizations-test-helpers.js";
import { setUserRoles } from "../sites/sites-test-helpers.js";
import type { SiteResponseDto } from "../sites/sites.dto.js";
import {
  countPhasesForSite,
  findPhaseAuditLog,
  findSiteMemberRoleCodes,
  setSiteMemberRoles,
} from "./phases-test-helpers.js";
import type { PhaseResponseDto } from "./phases.dto.js";

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

it("inscrit automatiquement le createur du chantier comme membre autorise", async () => {
  const account = await createChefChantierAccount();
  const site = await createSite(account);

  const roleCodes = await findSiteMemberRoleCodes(
    databaseService,
    site.id,
    account.response.user.id,
  );

  expect(roleCodes).toStrictEqual(["chef_chantier"]);
});

it("journalise la creation d'une phase sans exposer de donnees sensibles", async () => {
  const account = await createChefChantierAccount();
  const site = await createSite(account);
  const phase = await createPhase(account, site.id);

  const auditLog = await findPhaseAuditLog(databaseService, phase.id);

  expect(auditLog).not.toBeNull();
  expect(auditLog?.action).toBe("phase.created");
  expect(auditLog?.organization_id).toBe(account.response.organization.id);
  expect(auditLog?.actor_user_id).toBe(account.response.user.id);
  expect(auditLog?.metadata).toStrictEqual({
    phaseId: phase.id,
    position: phase.position,
    siteId: site.id,
  });
  expect(auditLog?.metadata).not.toHaveProperty("accessToken");
  expect(auditLog?.metadata).not.toHaveProperty("password");
  expect(auditLog?.metadata).not.toHaveProperty("description");
  expect(auditLog?.metadata).not.toHaveProperty("name");
});

it("refuse un chef de chantier sans appartenance au chantier", async () => {
  const account = await createChefChantierAccount();
  const site = await createSite(account);
  await setSiteMemberRoles(databaseService, site.id, account.response.user.id, []);

  const response = await request(getHttpServer())
    .post(`/api/sites/${site.id}/phases`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ name: "Phase interdite" })
    .expect(403);

  expect(parseApiErrorResponse(response).message).toContain("Vous n'avez pas accès à ce chantier.");
  expect(await countPhasesForSite(databaseService, site.id)).toBe(0);
});

it("refuse un membre du chantier avec un role chantier insuffisant", async () => {
  const account = await createChefChantierAccount();
  const site = await createSite(account);
  await setSiteMemberRoles(databaseService, site.id, account.response.user.id, ["ouvrier"]);

  const response = await request(getHttpServer())
    .post(`/api/sites/${site.id}/phases`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ name: "Phase role chantier interdit" })
    .expect(403);

  expect(parseApiErrorResponse(response).message).toContain("Vous n'avez pas accès à ce chantier.");
  expect(await countPhasesForSite(databaseService, site.id)).toBe(0);
});

it("masque les chantiers d'une autre organisation", async () => {
  const accountA = await createChefChantierAccount();
  const accountB = await createChefChantierAccount();
  const siteA = await createSite(accountA);

  const response = await request(getHttpServer())
    .post(`/api/sites/${siteA.id}/phases`)
    .set("Authorization", `Bearer ${accountB.response.accessToken}`)
    .send({ name: "Phase cross-org" })
    .expect(404);

  expect(parseApiErrorResponse(response).message).toContain("Le chantier est introuvable.");
  expect(await countPhasesForSite(databaseService, siteA.id)).toBe(0);
});

function getHttpServer(): Server {
  return app.getHttpServer();
}

async function createChefChantierAccount(): Promise<RegisteredTestAccount> {
  const account = await createRegisteredAccount();
  await setUserRoles(databaseService, account.response.user.id, ["chef_chantier"]);

  return account;
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

async function createSite(account: RegisteredTestAccount): Promise<SiteResponseDto> {
  const response = await request(getHttpServer())
    .post("/api/sites")
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ name: "Chantier Securise" })
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
    .send({
      description: "Description absente du journal",
      estimatedDurationDays: 10,
      name: "Phase audit",
    })
    .expect(201);

  return parsePhaseResponse(response);
}

function parsePhaseResponse(response: Response): PhaseResponseDto {
  return JSON.parse(response.text) as PhaseResponseDto;
}
