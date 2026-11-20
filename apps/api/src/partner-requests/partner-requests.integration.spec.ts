import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import type { Server } from "node:http";
import request, { type Response } from "supertest";
import { afterAll, afterEach, beforeAll, expect, it } from "vitest";

import { configureHttpApp } from "../app-http.js";
import { AppModule } from "../app.module.js";
import { DatabaseService } from "../database/database.service.js";
import { deleteCreatedOrganizations } from "../organizations/organization-invitations-test-helpers.js";
import { createOrganizationUser } from "../organizations/organization-user-management-test-helpers.js";
import {
  createRegisterRequest,
  parseApiErrorResponse,
  parseRegisterResponse,
  type RegisteredTestAccount,
} from "../organizations/organizations-test-helpers.js";
import { setUserRoles } from "../sites/sites-test-helpers.js";
import type { PartnerRequestsResponseDto } from "./partner-requests.dto.js";

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

it("liste les demandes d'architecte et de droniste d'un chantier", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);

  await createArchitectRequest(account, siteId, "Expertise structure");
  await createDroneRequest(account, siteId, "Relevé topographique");

  const response = await request(getHttpServer())
    .get("/api/partner-requests")
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .expect(200);

  const body = parsePartnerRequestsResponse(response);

  expect(body.total).toBe(2);
  expect(body.items).toHaveLength(2);
  expect(body.items.map((item) => item.partnerType).sort()).toEqual(["architect", "drone"]);
  expect(body.items.every((item) => item.siteId === siteId)).toBe(true);
  expect(body.items.every((item) => item.siteName === "Chantier Test")).toBe(true);
});

it("retourne une liste vide lorsqu'aucune demande n'existe", async () => {
  const account = await createChefChantierAccount();

  const response = await request(getHttpServer())
    .get("/api/partner-requests")
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .expect(200);

  const body = parsePartnerRequestsResponse(response);

  expect(body.items).toEqual([]);
  expect(body.total).toBe(0);
});

it("filtre les demandes par type de partenaire", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);

  await createArchitectRequest(account, siteId, "Expertise structure");
  await createDroneRequest(account, siteId, "Relevé topographique");

  const response = await request(getHttpServer())
    .get("/api/partner-requests")
    .query({ partnerType: "drone" })
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .expect(200);

  const body = parsePartnerRequestsResponse(response);

  expect(body.items).toHaveLength(1);
  expect(body.items[0]?.partnerType).toBe("drone");
});

it("filtre les demandes par chantier", async () => {
  const account = await createChefChantierAccount();
  const firstSiteId = await createSite(account);
  const secondSiteId = await createSite(account);

  await createArchitectRequest(account, firstSiteId, "Mission chantier 1");
  await createArchitectRequest(account, secondSiteId, "Mission chantier 2");

  const response = await request(getHttpServer())
    .get("/api/partner-requests")
    .query({ siteId: firstSiteId })
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .expect(200);

  const body = parsePartnerRequestsResponse(response);

  expect(body.items).toHaveLength(1);
  expect(body.items[0]?.siteId).toBe(firstSiteId);
});

it("pagine les resultats", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);

  await createArchitectRequest(account, siteId, "Mission 1");
  await createArchitectRequest(account, siteId, "Mission 2");
  await createArchitectRequest(account, siteId, "Mission 3");

  const firstPage = await request(getHttpServer())
    .get("/api/partner-requests")
    .query({ page: 1, pageSize: 2 })
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .expect(200);
  const secondPage = await request(getHttpServer())
    .get("/api/partner-requests")
    .query({ page: 2, pageSize: 2 })
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .expect(200);

  const firstBody = parsePartnerRequestsResponse(firstPage);
  const secondBody = parsePartnerRequestsResponse(secondPage);

  expect(firstBody.total).toBe(3);
  expect(firstBody.items).toHaveLength(2);
  expect(secondBody.items).toHaveLength(1);
  const allIds = new Set([...firstBody.items, ...secondBody.items].map((item) => item.id));
  expect(allIds.size).toBe(3);
});

it("permet a un administrateur du chantier de voir les demandes creees par le chef de chantier", async () => {
  const chefAccount = await createChefChantierAccount();
  const siteId = await createSite(chefAccount);
  await createDroneRequest(chefAccount, siteId, "Mission droniste");

  const admin = await createOrganizationUser(
    databaseService,
    chefAccount.response.organization.id,
    ["administrateur"],
  );
  await request(getHttpServer())
    .post(`/api/projects/${siteId}/users`)
    .set("Authorization", `Bearer ${chefAccount.response.accessToken}`)
    .send({ userId: admin.id })
    .expect(201);

  const response = await request(getHttpServer())
    .get("/api/partner-requests")
    .set("Authorization", `Bearer ${signAdminAccessToken(admin.id, chefAccount)}`)
    .expect(200);

  const body = parsePartnerRequestsResponse(response);

  expect(body.items).toHaveLength(1);
  expect(body.items[0]?.siteId).toBe(siteId);
});

it("n'expose pas les demandes d'une autre organisation", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);
  await createArchitectRequest(account, siteId, "Mission confidentielle");

  const otherAccount = await createChefChantierAccount();

  const response = await request(getHttpServer())
    .get("/api/partner-requests")
    .set("Authorization", `Bearer ${otherAccount.response.accessToken}`)
    .expect(200);

  const body = parsePartnerRequestsResponse(response);

  expect(body.items).toEqual([]);
  expect(body.total).toBe(0);
});

it("refuse la consultation sans token JWT", async () => {
  await request(getHttpServer()).get("/api/partner-requests").expect(401);
});

it("refuse la consultation sans le role requis", async () => {
  const account = await createRegisteredAccount();
  await setUserRoles(databaseService, account.response.user.id, ["ouvrier"]);

  const response = await request(getHttpServer())
    .get("/api/partner-requests")
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .expect(403);

  expect(parseApiErrorResponse(response).message).toContain(
    "Vous n'avez pas le rôle requis pour cette action.",
  );
});

it("retourne 404 si le chantier filtre est introuvable", async () => {
  const account = await createChefChantierAccount();

  const response = await request(getHttpServer())
    .get("/api/partner-requests")
    .query({ siteId: "00000000-0000-4000-a000-000000000000" })
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .expect(404);

  expect(parseApiErrorResponse(response).message).toContain("Le chantier est introuvable.");
});

it("refuse le filtre sur un chantier auquel l'utilisateur n'a pas accès", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);

  const otherAccount = await createChefChantierAccount();

  const response = await request(getHttpServer())
    .get("/api/partner-requests")
    .query({ siteId })
    .set("Authorization", `Bearer ${otherAccount.response.accessToken}`)
    .expect(404);

  expect(parseApiErrorResponse(response).message).toContain("Le chantier est introuvable.");
});

it("refuse un type de partenaire invalide", async () => {
  const account = await createChefChantierAccount();

  await request(getHttpServer())
    .get("/api/partner-requests")
    .query({ partnerType: "plombier" })
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .expect(400);
});

it("refuse une pagination invalide", async () => {
  const account = await createChefChantierAccount();

  await request(getHttpServer())
    .get("/api/partner-requests")
    .query({ page: 0 })
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .expect(400);

  await request(getHttpServer())
    .get("/api/partner-requests")
    .query({ pageSize: 101 })
    .set("Authorization", `Bearer ${account.response.accessToken}`)
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
): Promise<void> {
  await request(getHttpServer())
    .post(`/api/sites/${siteId}/architect-requests`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ missionDescription })
    .expect(201);
}

async function createDroneRequest(
  account: RegisteredTestAccount,
  siteId: string,
  missionDescription: string,
): Promise<void> {
  await request(getHttpServer())
    .post(`/api/sites/${siteId}/drone-requests`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ missionDescription })
    .expect(201);
}

function signAdminAccessToken(adminUserId: string, chefAccount: RegisteredTestAccount): string {
  return app.get(JwtService).sign({
    email: "admin-chantier@smartsite.test",
    organizationId: chefAccount.response.organization.id,
    roles: ["administrateur"],
    sub: adminUserId,
  });
}

function parsePartnerRequestsResponse(response: Response): PartnerRequestsResponseDto {
  return JSON.parse(response.text) as PartnerRequestsResponseDto;
}
