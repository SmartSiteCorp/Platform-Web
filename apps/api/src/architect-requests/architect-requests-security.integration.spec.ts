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
import { setSiteMemberRoles } from "../planning/phases-test-helpers.js";
import { setUserRoles } from "../sites/sites-test-helpers.js";
import type { SiteResponseDto } from "../sites/sites.dto.js";
import {
  countArchitectRequestsForSite,
  findArchitectRequestAuditLog,
} from "./architect-requests-test-helpers.js";
import type { ArchitectRequestResponseDto } from "./architect-requests.dto.js";

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

it("journalise la creation d'une demande sans exposer de donnees sensibles", async () => {
  const account = await createChefChantierAccount();
  const site = await createSite(account);
  const architectRequest = await createArchitectRequest(account, site.id);

  const auditLog = await findArchitectRequestAuditLog(databaseService, architectRequest.id);

  expect(auditLog).not.toBeNull();
  expect(auditLog?.action).toBe("architect_request.created");
  expect(auditLog?.organization_id).toBe(account.response.organization.id);
  expect(auditLog?.actor_user_id).toBe(account.response.user.id);
  expect(auditLog?.metadata).toStrictEqual({
    architectRequestId: architectRequest.id,
    siteId: site.id,
  });
  expect(auditLog?.metadata).not.toHaveProperty("accessToken");
  expect(auditLog?.metadata).not.toHaveProperty("password");
  expect(auditLog?.metadata).not.toHaveProperty("missionDescription");
});

it("refuse un chef de chantier sans appartenance au chantier", async () => {
  const account = await createChefChantierAccount();
  const site = await createSite(account);
  await setSiteMemberRoles(databaseService, site.id, account.response.user.id, []);

  const response = await request(getHttpServer())
    .post(`/api/sites/${site.id}/architect-requests`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ missionDescription: "Mission interdite" })
    .expect(403);

  expect(parseApiErrorResponse(response).message).toContain("Vous n'avez pas accès à ce chantier.");
  expect(await countArchitectRequestsForSite(databaseService, site.id)).toBe(0);
});

it("refuse un membre du chantier avec un role chantier insuffisant", async () => {
  const account = await createChefChantierAccount();
  const site = await createSite(account);
  await setSiteMemberRoles(databaseService, site.id, account.response.user.id, ["ouvrier"]);

  const response = await request(getHttpServer())
    .post(`/api/sites/${site.id}/architect-requests`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ missionDescription: "Mission role chantier interdit" })
    .expect(403);

  expect(parseApiErrorResponse(response).message).toContain("Vous n'avez pas accès à ce chantier.");
  expect(await countArchitectRequestsForSite(databaseService, site.id)).toBe(0);
});

it("masque les chantiers d'une autre organisation", async () => {
  const accountA = await createChefChantierAccount();
  const accountB = await createChefChantierAccount();
  const siteA = await createSite(accountA);

  const response = await request(getHttpServer())
    .post(`/api/sites/${siteA.id}/architect-requests`)
    .set("Authorization", `Bearer ${accountB.response.accessToken}`)
    .send({ missionDescription: "Mission cross-org" })
    .expect(404);

  expect(parseApiErrorResponse(response).message).toContain("Le chantier est introuvable.");
  expect(await countArchitectRequestsForSite(databaseService, siteA.id)).toBe(0);
});

it("masque les demandes d'architecte d'une autre organisation a la lecture", async () => {
  const accountA = await createChefChantierAccount();
  const accountB = await createChefChantierAccount();
  const siteA = await createSite(accountA);
  await createArchitectRequest(accountA, siteA.id);

  const response = await request(getHttpServer())
    .get(`/api/sites/${siteA.id}/architect-requests`)
    .set("Authorization", `Bearer ${accountB.response.accessToken}`)
    .expect(404);

  expect(parseApiErrorResponse(response).message).toContain("Le chantier est introuvable.");
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

async function createArchitectRequest(
  account: RegisteredTestAccount,
  siteId: string,
): Promise<ArchitectRequestResponseDto> {
  const response = await request(getHttpServer())
    .post(`/api/sites/${siteId}/architect-requests`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ missionDescription: "Description absente du journal" })
    .expect(201);

  return parseArchitectRequestResponse(response);
}

function parseArchitectRequestResponse(response: Response): ArchitectRequestResponseDto {
  return JSON.parse(response.text) as ArchitectRequestResponseDto;
}
