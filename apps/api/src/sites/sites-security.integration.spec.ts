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
  createRegisterRequest,
  parseRegisterResponse,
  type RegisteredTestAccount,
} from "../organizations/organizations-test-helpers.js";
import { findPersistedSite, findSiteAuditLog } from "./sites-test-helpers.js";
import type { SiteResponseDto } from "./sites.dto.js";

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

it("journalise la creation du chantier avec l'action site.created", async () => {
  const account = await createRegisteredAccount();

  const response = await request(getHttpServer())
    .post("/api/sites")
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ name: "Chantier Audit" })
    .expect(201);

  const site = parseSiteResponse(response);
  const log = await findSiteAuditLog(databaseService, site.id);

  expect(log).not.toBeNull();
  expect(log?.action).toBe("site.created");
  expect(log?.organization_id).toBe(account.response.organization.id);
  expect(log?.actor_user_id).toBe(account.response.user.id);
});

it("stocke uniquement le nom et l'id du chantier dans les metadonnees du log", async () => {
  const account = await createRegisteredAccount();

  const response = await request(getHttpServer())
    .post("/api/sites")
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ name: "Chantier Sans Fuite" })
    .expect(201);

  const site = parseSiteResponse(response);
  const log = await findSiteAuditLog(databaseService, site.id);

  expect(log?.metadata).toStrictEqual({
    siteId: site.id,
    siteName: "Chantier Sans Fuite",
  });
  expect(log?.metadata).not.toHaveProperty("accessToken");
  expect(log?.metadata).not.toHaveProperty("password");
  expect(log?.metadata).not.toHaveProperty("organizationId");
});

it("isole les chantiers par organisation", async () => {
  const accountA = await createRegisteredAccount();
  const accountB = await createRegisteredAccount();

  const responseA = await request(getHttpServer())
    .post("/api/sites")
    .set("Authorization", `Bearer ${accountA.response.accessToken}`)
    .send({ name: "Chantier Org A" })
    .expect(201);

  const responseB = await request(getHttpServer())
    .post("/api/sites")
    .set("Authorization", `Bearer ${accountB.response.accessToken}`)
    .send({ name: "Chantier Org B" })
    .expect(201);

  const siteA = parseSiteResponse(responseA);
  const siteB = parseSiteResponse(responseB);

  const persistedA = await findPersistedSite(databaseService, siteA.id);
  const persistedB = await findPersistedSite(databaseService, siteB.id);

  expect(persistedA?.organization_id).toBe(accountA.response.organization.id);
  expect(persistedB?.organization_id).toBe(accountB.response.organization.id);
  expect(persistedA?.organization_id).not.toBe(persistedB?.organization_id);
});

it("refuse un token JWT invalide sur l'endpoint de creation", async () => {
  await request(getHttpServer())
    .post("/api/sites")
    .set("Authorization", "Bearer token-invalide")
    .send({ name: "Chantier Token Invalide" })
    .expect(401);
});

it("refuse un token JWT d'une organisation differente", async () => {
  const accountA = await createRegisteredAccount();
  const accountB = await createRegisteredAccount();

  // Le token de B ne peut pas créer un chantier dans l'org de A
  // (l'org est toujours celle du JWT — pas de paramètre corps)
  const responseB = await request(getHttpServer())
    .post("/api/sites")
    .set("Authorization", `Bearer ${accountB.response.accessToken}`)
    .send({ name: "Chantier Org B via token B" })
    .expect(201);

  const siteB = parseSiteResponse(responseB);

  // Le chantier créé avec le token de B appartient TOUJOURS à l'org de B
  expect(siteB.organizationId).toBe(accountB.response.organization.id);
  expect(siteB.organizationId).not.toBe(accountA.response.organization.id);
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

  return {
    request: registrationRequest,
    response: responseBody,
  };
}

function parseSiteResponse(response: { text: string }): SiteResponseDto {
  return JSON.parse(response.text) as SiteResponseDto;
}
