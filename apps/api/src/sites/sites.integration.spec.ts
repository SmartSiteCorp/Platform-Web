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
import { findPersistedSite, setUserRoles } from "./sites-test-helpers.js";
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

it("cree un chantier valide et le retourne", async () => {
  const account = await createRegisteredAccount();

  const response = await request(getHttpServer())
    .post("/api/sites")
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({
      address: "12 rue des Artisans, 75001 Paris",
      estimatedDurationDays: 90,
      name: "Chantier Renaud",
      startDate: "2026-07-01",
    })
    .expect(201);

  const site = parseSiteResponse(response);

  expect(site.name).toBe("Chantier Renaud");
  expect(site.address).toBe("12 rue des Artisans, 75001 Paris");
  expect(site.startDate).toBe("2026-07-01");
  expect(site.estimatedDurationDays).toBe(90);
  expect(site.status).toBe("planned");
  expect(site.organizationId).toBe(account.response.organization.id);
  expect(site.createdBy).toBe(account.response.user.id);
  expect(site.id).toBeTypeOf("string");
});

it("associe le chantier a l'organisation de l'utilisateur", async () => {
  const account = await createRegisteredAccount();

  const response = await request(getHttpServer())
    .post("/api/sites")
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ name: "Chantier Association Test" })
    .expect(201);

  const site = parseSiteResponse(response);
  const persisted = await findPersistedSite(databaseService, site.id);

  expect(persisted?.organization_id).toBe(account.response.organization.id);
  expect(persisted?.name).toBe("Chantier Association Test");
  expect(persisted?.status).toBe("planned");
});

it("cree un chantier avec uniquement le nom obligatoire", async () => {
  const account = await createRegisteredAccount();

  const response = await request(getHttpServer())
    .post("/api/sites")
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ name: "Chantier Minimal" })
    .expect(201);

  const site = parseSiteResponse(response);

  expect(site.name).toBe("Chantier Minimal");
  expect(site.address).toBeNull();
  expect(site.startDate).toBeNull();
  expect(site.estimatedDurationDays).toBeNull();
});

it("autorise un chef de chantier a creer un chantier", async () => {
  const account = await createRegisteredAccount();

  await setUserRoles(databaseService, account.response.user.id, ["chef_chantier"]);

  const response = await request(getHttpServer())
    .post("/api/sites")
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ name: "Chantier Chef" })
    .expect(201);

  expect(parseSiteResponse(response).status).toBe("planned");
});

it("refuse la creation sans token JWT", async () => {
  await request(getHttpServer())
    .post("/api/sites")
    .send({ name: "Chantier Sans Auth" })
    .expect(401);
});

it("refuse la creation sans le role requis", async () => {
  const account = await createRegisteredAccount();

  await setUserRoles(databaseService, account.response.user.id, ["ouvrier"]);

  const response = await request(getHttpServer())
    .post("/api/sites")
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ name: "Chantier Interdit" })
    .expect(403);

  expect(parseApiErrorResponse(response).message).toContain(
    "Vous n'avez pas le rôle requis pour cette action.",
  );
});

it("refuse un chantier sans nom", async () => {
  const account = await createRegisteredAccount();

  const response = await request(getHttpServer())
    .post("/api/sites")
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ name: "" })
    .expect(400);

  expect(parseApiErrorResponse(response).message).toContain("Le nom du chantier est obligatoire.");
});

it("refuse une date de debut au mauvais format", async () => {
  const account = await createRegisteredAccount();

  const response = await request(getHttpServer())
    .post("/api/sites")
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ name: "Chantier Date", startDate: "01/07/2026" })
    .expect(400);

  expect(parseApiErrorResponse(response).message).toContain(
    "La date de début doit être au format YYYY-MM-DD.",
  );
});

it("refuse une duree estimee inferieure a 1", async () => {
  const account = await createRegisteredAccount();

  const response = await request(getHttpServer())
    .post("/api/sites")
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ estimatedDurationDays: 0, name: "Chantier Duree" })
    .expect(400);

  expect(parseApiErrorResponse(response).message).toContain(
    "La durée estimée doit être d'au moins 1 jour.",
  );
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

function parseSiteResponse(response: Response): SiteResponseDto {
  return JSON.parse(response.text) as SiteResponseDto;
}
