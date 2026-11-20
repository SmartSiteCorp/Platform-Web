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
import {
  countPhasesForSite,
  findPersistedPhase,
  findPhasesBySiteOrdered,
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

it("cree une phase valide et la retourne", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);

  const response = await request(getHttpServer())
    .post(`/api/sites/${siteId}/phases`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({
      description: "Fondations et structure principale",
      estimatedDurationDays: 30,
      name: "Gros œuvre",
      startDate: "2026-07-01",
    })
    .expect(201);

  const phase = parsePhaseResponse(response);

  expect(phase.name).toBe("Gros œuvre");
  expect(phase.description).toBe("Fondations et structure principale");
  expect(phase.startDate).toBe("2026-07-01");
  expect(phase.estimatedDurationDays).toBe(30);
  expect(phase.status).toBe("planned");
  expect(phase.siteId).toBe(siteId);
  expect(phase.progressPercent).toBe(0);
  expect(phase.position).toBe(1);
  expect(phase.id).toBeTypeOf("string");
  expect(phase.createdAt).toBeTypeOf("string");
  expect(phase.updatedAt).toBeTypeOf("string");
});

it("cree une phase avec uniquement le nom obligatoire", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);

  const response = await request(getHttpServer())
    .post(`/api/sites/${siteId}/phases`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ name: "Phase minimale" })
    .expect(201);

  const phase = parsePhaseResponse(response);

  expect(phase.name).toBe("Phase minimale");
  expect(phase.description).toBeNull();
  expect(phase.startDate).toBeNull();
  expect(phase.estimatedDurationDays).toBeNull();
  expect(phase.position).toBe(1);
});

it("persiste la phase en base de données", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);

  const response = await request(getHttpServer())
    .post(`/api/sites/${siteId}/phases`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ description: "Description de test", name: "Phase persistée" })
    .expect(201);

  const phase = parsePhaseResponse(response);
  const persisted = await findPersistedPhase(databaseService, phase.id);

  expect(persisted).not.toBeNull();
  expect(persisted?.site_id).toBe(siteId);
  expect(persisted?.name).toBe("Phase persistée");
  expect(persisted?.description).toBe("Description de test");
  expect(persisted?.status).toBe("planned");
  expect(persisted?.position).toBe(1);
});

it("assigne des positions croissantes aux phases successives", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);

  await createPhase(account, siteId, "Phase 1");
  await createPhase(account, siteId, "Phase 2");
  await createPhase(account, siteId, "Phase 3");

  const phases = await findPhasesBySiteOrdered(databaseService, siteId);

  expect(phases).toHaveLength(3);
  expect(phases[0]?.position).toBe(1);
  expect(phases[1]?.position).toBe(2);
  expect(phases[2]?.position).toBe(3);
  expect(phases[0]?.name).toBe("Phase 1");
  expect(phases[1]?.name).toBe("Phase 2");
  expect(phases[2]?.name).toBe("Phase 3");
});

it("les positions sont independantes entre deux chantiers", async () => {
  const account = await createChefChantierAccount();
  const siteId1 = await createSite(account);
  const siteId2 = await createSite(account);

  await createPhase(account, siteId1, "Phase A");
  await createPhase(account, siteId1, "Phase B");
  const phase = await createPhase(account, siteId2, "Phase X");

  expect(phase.position).toBe(1);

  const count1 = await countPhasesForSite(databaseService, siteId1);
  const count2 = await countPhasesForSite(databaseService, siteId2);

  expect(count1).toBe(2);
  expect(count2).toBe(1);
});

it("autorise un administrateur a creer une phase", async () => {
  const account = await createRegisteredAccount();
  const siteId = await createSite(account);

  const response = await request(getHttpServer())
    .post(`/api/sites/${siteId}/phases`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ name: "Phase admin" })
    .expect(201);

  expect(parsePhaseResponse(response).status).toBe("planned");
});

it("refuse la creation sans token JWT", async () => {
  await request(getHttpServer())
    .post("/api/sites/00000000-0000-4000-a000-000000000000/phases")
    .send({ name: "Phase sans auth" })
    .expect(401);
});

it("refuse la creation sans le role requis", async () => {
  const account = await createRegisteredAccount();
  const siteId = await createSite(account);
  await setUserRoles(databaseService, account.response.user.id, ["ouvrier"]);

  const response = await request(getHttpServer())
    .post(`/api/sites/${siteId}/phases`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ name: "Phase interdite" })
    .expect(403);

  expect(parseApiErrorResponse(response).message).toContain(
    "Vous n'avez pas le rôle requis pour cette action.",
  );
});

it("retourne 404 si le chantier est introuvable", async () => {
  const account = await createChefChantierAccount();

  const response = await request(getHttpServer())
    .post("/api/sites/00000000-0000-4000-a000-000000000000/phases")
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ name: "Phase chantier inconnu" })
    .expect(404);

  expect(parseApiErrorResponse(response).message).toContain("Le chantier est introuvable.");
});

it("refuse une phase sans nom", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);

  const response = await request(getHttpServer())
    .post(`/api/sites/${siteId}/phases`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ name: "" })
    .expect(400);

  expect(parseApiErrorResponse(response).message).toContain("Le nom de la phase est obligatoire.");
});

it("refuse une date de debut au mauvais format", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);

  const response = await request(getHttpServer())
    .post(`/api/sites/${siteId}/phases`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ name: "Phase date", startDate: "01/07/2026" })
    .expect(400);

  expect(parseApiErrorResponse(response).message).toContain(
    "La date de début doit être au format YYYY-MM-DD.",
  );
});

it("refuse une duree estimee inferieure a 1", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);

  const response = await request(getHttpServer())
    .post(`/api/sites/${siteId}/phases`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ estimatedDurationDays: 0, name: "Phase durée" })
    .expect(400);

  expect(parseApiErrorResponse(response).message).toContain(
    "La durée estimée doit être d'au moins 1 jour.",
  );
});

it("refuse un siteId qui n'est pas un UUID valide", async () => {
  const account = await createChefChantierAccount();

  await request(getHttpServer())
    .post("/api/sites/not-a-uuid/phases")
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ name: "Phase uuid invalide" })
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

async function createPhase(
  account: RegisteredTestAccount,
  siteId: string,
  name: string,
): Promise<PhaseResponseDto> {
  const response = await request(getHttpServer())
    .post(`/api/sites/${siteId}/phases`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ name })
    .expect(201);

  return parsePhaseResponse(response);
}

function parsePhaseResponse(response: Response): PhaseResponseDto {
  return JSON.parse(response.text) as PhaseResponseDto;
}
