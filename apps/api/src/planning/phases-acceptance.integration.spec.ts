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
  findPersistedPhase,
  findPhaseAuditLog,
  findPhasesBySiteOrdered,
  setSiteMemberRoles,
} from "./phases-test-helpers.js";
import type { PhaseResponseDto } from "./phases.dto.js";
import { phaseUpdatedAuditAction } from "./phases.types.js";

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

it("valide la recette CDC de creation et modification des phases chantier", async () => {
  const account = await createChefChantierAccount();
  const site = await createSite(account);

  await createPhase(account, site.id, {
    estimatedDurationDays: 30,
    name: "Gros œuvre",
    startDate: "2026-07-01",
  });
  const secondPhase = await createPhase(account, site.id, {
    estimatedDurationDays: 20,
    name: "Second œuvre",
    startDate: "2026-08-01",
  });
  await createPhase(account, site.id, {
    estimatedDurationDays: 10,
    name: "Finitions",
    startDate: "2026-09-01",
  });

  const updateResponse = await request(getHttpServer())
    .patch(`/api/sites/${site.id}/phases/${secondPhase.id}`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({
      description: "Cloisons, réseaux et contrôles",
      estimatedDurationDays: 18,
      name: "Second œuvre ajusté",
      startDate: "2026-08-05",
    })
    .expect(200);
  const updatedPhase = parsePhaseResponse(updateResponse);

  expect(updatedPhase.id).toBe(secondPhase.id);
  expect(updatedPhase.name).toBe("Second œuvre ajusté");
  expect(updatedPhase.description).toBe("Cloisons, réseaux et contrôles");
  expect(updatedPhase.estimatedDurationDays).toBe(18);
  expect(updatedPhase.startDate).toBe("2026-08-05");
  expect(updatedPhase.position).toBe(2);
  expect(updatedPhase.siteId).toBe(site.id);

  const persistedPhase = await findPersistedPhase(databaseService, secondPhase.id);

  expect(persistedPhase).not.toBeNull();
  expect(persistedPhase?.name).toBe("Second œuvre ajusté");
  expect(persistedPhase?.description).toBe("Cloisons, réseaux et contrôles");
  expect(persistedPhase?.estimated_duration_days).toBe(18);
  expect(persistedPhase?.start_date).toBe("2026-08-05");

  const orderedPhases = await findPhasesBySiteOrdered(databaseService, site.id);

  expect(orderedPhases.map((phase) => phase.position)).toStrictEqual([1, 2, 3]);
  expect(orderedPhases.map((phase) => phase.name)).toStrictEqual([
    "Gros œuvre",
    "Second œuvre ajusté",
    "Finitions",
  ]);

  const auditLog = await findPhaseAuditLog(
    databaseService,
    secondPhase.id,
    phaseUpdatedAuditAction,
  );

  expect(auditLog).not.toBeNull();
  expect(auditLog?.action).toBe("phase.updated");
  expect(auditLog?.changed_fields).toStrictEqual([
    "name",
    "description",
    "startDate",
    "estimatedDurationDays",
  ]);
  expect(auditLog?.metadata).toStrictEqual({
    phaseId: secondPhase.id,
    position: 2,
    siteId: site.id,
  });
  expect(auditLog?.metadata).not.toHaveProperty("name");
  expect(auditLog?.metadata).not.toHaveProperty("description");
});

it("refuse la modification avec un nom vide apres trim", async () => {
  const account = await createChefChantierAccount();
  const site = await createSite(account);
  const phase = await createPhase(account, site.id, {
    estimatedDurationDays: 12,
    name: "Phase initiale",
  });

  const response = await request(getHttpServer())
    .patch(`/api/sites/${site.id}/phases/${phase.id}`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ name: "   " })
    .expect(400);

  expect(parseApiErrorResponse(response).message).toContain("Le nom de la phase est obligatoire.");
  expect((await findPersistedPhase(databaseService, phase.id))?.name).toBe("Phase initiale");
});

it("retourne 404 quand la phase a modifier est introuvable", async () => {
  const account = await createChefChantierAccount();
  const site = await createSite(account);

  const response = await request(getHttpServer())
    .patch(`/api/sites/${site.id}/phases/00000000-0000-4000-a000-000000000000`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ name: "Phase inconnue" })
    .expect(404);

  expect(parseApiErrorResponse(response).message).toContain("La phase est introuvable.");
});

it("refuse la modification sans appartenance au chantier", async () => {
  const account = await createChefChantierAccount();
  const site = await createSite(account);
  const phase = await createPhase(account, site.id, { name: "Phase protégée" });
  await setSiteMemberRoles(databaseService, site.id, account.response.user.id, []);

  const response = await request(getHttpServer())
    .patch(`/api/sites/${site.id}/phases/${phase.id}`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ name: "Modification interdite" })
    .expect(403);

  expect(parseApiErrorResponse(response).message).toContain("Vous n'avez pas accès à ce chantier.");
  expect((await findPersistedPhase(databaseService, phase.id))?.name).toBe("Phase protégée");
});

it("masque la modification d'une phase entre organisations", async () => {
  const accountA = await createChefChantierAccount();
  const accountB = await createChefChantierAccount();
  const siteA = await createSite(accountA);
  const phaseA = await createPhase(accountA, siteA.id, { name: "Phase organisation A" });

  const response = await request(getHttpServer())
    .patch(`/api/sites/${siteA.id}/phases/${phaseA.id}`)
    .set("Authorization", `Bearer ${accountB.response.accessToken}`)
    .send({ name: "Phase organisation B" })
    .expect(404);

  expect(parseApiErrorResponse(response).message).toContain("Le chantier est introuvable.");
  expect((await findPersistedPhase(databaseService, phaseA.id))?.name).toBe("Phase organisation A");
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
    .send({ name: "Chantier Recette Phases" })
    .expect(201);

  return JSON.parse(response.text) as SiteResponseDto;
}

interface PhaseCreationPayload {
  readonly estimatedDurationDays?: number;
  readonly name: string;
  readonly startDate?: string;
}

async function createPhase(
  account: RegisteredTestAccount,
  siteId: string,
  payload: PhaseCreationPayload,
): Promise<PhaseResponseDto> {
  const response = await request(getHttpServer())
    .post(`/api/sites/${siteId}/phases`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({
      estimatedDurationDays: payload.estimatedDurationDays ?? null,
      name: payload.name,
      startDate: payload.startDate ?? null,
    })
    .expect(201);

  return parsePhaseResponse(response);
}

function parsePhaseResponse(response: Response): PhaseResponseDto {
  return JSON.parse(response.text) as PhaseResponseDto;
}
