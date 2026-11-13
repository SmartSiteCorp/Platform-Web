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
import { findPersistedArchitectRequest } from "./architect-requests-test-helpers.js";
import type {
  ArchitectRequestResponseDto,
  ArchitectRequestsResponseDto,
} from "./architect-requests.dto.js";

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

it("cree une demande d'architecte valide et la retourne", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);

  const response = await request(getHttpServer())
    .post(`/api/sites/${siteId}/architect-requests`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({
      missionDescription: "Avis technique sur la stabilité de la structure",
      requestedDate: "2026-07-01",
    })
    .expect(201);

  const architectRequest = parseArchitectRequestResponse(response);

  expect(architectRequest.siteId).toBe(siteId);
  expect(architectRequest.missionDescription).toBe(
    "Avis technique sur la stabilité de la structure",
  );
  expect(architectRequest.requestedDate).toBe("2026-07-01");
  expect(architectRequest.status).toBe("pending");
  expect(architectRequest.id).toBeTypeOf("string");
  expect(architectRequest.createdAt).toBeTypeOf("string");
  expect(architectRequest.updatedAt).toBeTypeOf("string");
});

it("cree une demande d'architecte sans champs optionnels", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);

  const response = await request(getHttpServer())
    .post(`/api/sites/${siteId}/architect-requests`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({})
    .expect(201);

  const architectRequest = parseArchitectRequestResponse(response);

  expect(architectRequest.missionDescription).toBeNull();
  expect(architectRequest.requestedDate).toBeNull();
  expect(architectRequest.status).toBe("pending");
});

it("persiste la demande d'architecte en base de données", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);

  const response = await request(getHttpServer())
    .post(`/api/sites/${siteId}/architect-requests`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ missionDescription: "Expertise charpente" })
    .expect(201);

  const architectRequest = parseArchitectRequestResponse(response);
  const persisted = await findPersistedArchitectRequest(databaseService, architectRequest.id);

  expect(persisted).not.toBeNull();
  expect(persisted?.site_id).toBe(siteId);
  expect(persisted?.requested_by).toBe(account.response.user.id);
  expect(persisted?.mission_description).toBe("Expertise charpente");
  expect(persisted?.status).toBe("pending");
});

it("liste les demandes d'architecte d'un chantier", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);

  await createArchitectRequest(account, siteId, "Mission 1");
  await createArchitectRequest(account, siteId, "Mission 2");

  const response = await request(getHttpServer())
    .get(`/api/sites/${siteId}/architect-requests`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .expect(200);

  const body = parseArchitectRequestsResponse(response);

  expect(body.siteId).toBe(siteId);
  expect(body.architectRequests).toHaveLength(2);
});

it("autorise un administrateur a creer une demande d'architecte", async () => {
  const account = await createRegisteredAccount();
  const siteId = await createSite(account);

  const response = await request(getHttpServer())
    .post(`/api/sites/${siteId}/architect-requests`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ missionDescription: "Mission admin" })
    .expect(201);

  expect(parseArchitectRequestResponse(response).status).toBe("pending");
});

it("refuse la creation sans token JWT", async () => {
  await request(getHttpServer())
    .post("/api/sites/00000000-0000-4000-a000-000000000000/architect-requests")
    .send({ missionDescription: "Mission sans auth" })
    .expect(401);
});

it("refuse la creation sans le role requis", async () => {
  const account = await createRegisteredAccount();
  const siteId = await createSite(account);
  await setUserRoles(databaseService, account.response.user.id, ["ouvrier"]);

  const response = await request(getHttpServer())
    .post(`/api/sites/${siteId}/architect-requests`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ missionDescription: "Mission interdite" })
    .expect(403);

  expect(parseApiErrorResponse(response).message).toContain(
    "Vous n'avez pas le rôle requis pour cette action.",
  );
});

it("retourne 404 si le chantier est introuvable", async () => {
  const account = await createChefChantierAccount();

  const response = await request(getHttpServer())
    .post("/api/sites/00000000-0000-4000-a000-000000000000/architect-requests")
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ missionDescription: "Mission chantier inconnu" })
    .expect(404);

  expect(parseApiErrorResponse(response).message).toContain("Le chantier est introuvable.");
});

it("refuse une date souhaitee au mauvais format", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);

  const response = await request(getHttpServer())
    .post(`/api/sites/${siteId}/architect-requests`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ requestedDate: "01/07/2026" })
    .expect(400);

  expect(parseApiErrorResponse(response).message).toContain(
    "La date souhaitée doit être au format YYYY-MM-DD.",
  );
});

it("refuse un siteId qui n'est pas un UUID valide", async () => {
  const account = await createChefChantierAccount();

  await request(getHttpServer())
    .post("/api/sites/not-a-uuid/architect-requests")
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ missionDescription: "Mission uuid invalide" })
    .expect(400);
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

async function createSite(account: RegisteredTestAccount): Promise<string> {
  const response = await request(getHttpServer())
    .post("/api/sites")
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ name: "Chantier Test" })
    .expect(201);

  return (JSON.parse(response.text) as { id: string }).id;
}

async function createArchitectRequest(
  account: RegisteredTestAccount,
  siteId: string,
  missionDescription: string,
): Promise<ArchitectRequestResponseDto> {
  const response = await request(getHttpServer())
    .post(`/api/sites/${siteId}/architect-requests`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ missionDescription })
    .expect(201);

  return parseArchitectRequestResponse(response);
}

function parseArchitectRequestResponse(response: Response): ArchitectRequestResponseDto {
  return JSON.parse(response.text) as ArchitectRequestResponseDto;
}

function parseArchitectRequestsResponse(response: Response): ArchitectRequestsResponseDto {
  return JSON.parse(response.text) as ArchitectRequestsResponseDto;
}
