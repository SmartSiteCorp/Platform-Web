import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { Server } from "node:http";
import request, { type Response } from "supertest";
import { afterAll, afterEach, beforeAll, expect, it } from "vitest";

import { configureHttpApp } from "../app-http.js";
import { AppModule } from "../app.module.js";
import { DatabaseService } from "../database/database.service.js";
import {
  deleteCreatedOrganizations,
  removeUserRoles,
} from "./organization-invitations-test-helpers.js";
import {
  createOrganizationUser,
  findPersistedRoleCodes,
} from "./organization-user-management-test-helpers.js";
import type { OrganizationUserRolesResponseDto } from "./organization-user-roles.dto.js";
import {
  createRegisterRequest,
  parseApiErrorResponse,
  parseRegisterResponse,
  type RegisteredTestAccount,
} from "./organizations-test-helpers.js";

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

it("returns organization user roles", async () => {
  const account = await createRegisteredAccount();
  const user = await createOrganizationUser(databaseService, account.response.organization.id, [
    "chef_chantier",
  ]);

  const response = await request(getHttpServer())
    .get(`/api/organizations/${account.response.organization.id}/users/${user.id}/roles`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .expect(200);

  expect(parseUserRolesResponse(response)).toStrictEqual({
    organizationId: account.response.organization.id,
    roleCodes: ["chef_chantier"],
    userId: user.id,
  });
});

it("adds a compatible user role and persists it", async () => {
  const account = await createRegisteredAccount();
  const user = await createOrganizationUser(databaseService, account.response.organization.id, [
    "chef_chantier",
  ]);

  const response = await request(getHttpServer())
    .post(`/api/organizations/${account.response.organization.id}/users/${user.id}/roles`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ roleCode: "droniste" })
    .expect(200);

  expect(parseUserRolesResponse(response)).toStrictEqual({
    organizationId: account.response.organization.id,
    roleCodes: ["chef_chantier", "droniste"],
    userId: user.id,
  });
  expect(await findPersistedRoleCodes(databaseService, user.id)).toStrictEqual([
    "chef_chantier",
    "droniste",
  ]);
});

it("keeps role assignment idempotent", async () => {
  const account = await createRegisteredAccount();
  const user = await createOrganizationUser(databaseService, account.response.organization.id, [
    "chef_chantier",
  ]);

  const response = await request(getHttpServer())
    .post(`/api/organizations/${account.response.organization.id}/users/${user.id}/roles`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ roleCode: "chef_chantier" })
    .expect(200);

  expect(parseUserRolesResponse(response).roleCodes).toStrictEqual(["chef_chantier"]);
  expect(await findPersistedRoleCodes(databaseService, user.id)).toStrictEqual(["chef_chantier"]);
});

it("removes a user role and persists the change", async () => {
  const account = await createRegisteredAccount();
  const user = await createOrganizationUser(databaseService, account.response.organization.id, [
    "chef_chantier",
    "droniste",
  ]);

  const response = await request(getHttpServer())
    .delete(
      `/api/organizations/${account.response.organization.id}/users/${user.id}/roles/droniste`,
    )
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .expect(200);

  expect(parseUserRolesResponse(response)).toStrictEqual({
    organizationId: account.response.organization.id,
    roleCodes: ["chef_chantier"],
    userId: user.id,
  });
  expect(await findPersistedRoleCodes(databaseService, user.id)).toStrictEqual(["chef_chantier"]);
});

it("rejects incompatible role combinations", async () => {
  const account = await createRegisteredAccount();
  const user = await createOrganizationUser(databaseService, account.response.organization.id, [
    "ouvrier",
  ]);

  const response = await request(getHttpServer())
    .post(`/api/organizations/${account.response.organization.id}/users/${user.id}/roles`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ roleCode: "droniste" })
    .expect(400);

  expect(parseApiErrorResponse(response).message).toContain(
    "Cette combinaison de rôles n'est pas autorisée.",
  );
  expect(await findPersistedRoleCodes(databaseService, user.id)).toStrictEqual(["ouvrier"]);
});

it("rejects manual organization admin role assignment", async () => {
  const account = await createRegisteredAccount();
  const user = await createOrganizationUser(databaseService, account.response.organization.id, [
    "chef_chantier",
  ]);

  const response = await request(getHttpServer())
    .post(`/api/organizations/${account.response.organization.id}/users/${user.id}/roles`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ roleCode: "administrateur" })
    .expect(400);

  expect(parseApiErrorResponse(response).message).toContain(
    "Ce rôle ne peut pas être attribué manuellement.",
  );
  expect(await findPersistedRoleCodes(databaseService, user.id)).toStrictEqual(["chef_chantier"]);
});

it("rejects removing the last user role", async () => {
  const account = await createRegisteredAccount();
  const user = await createOrganizationUser(databaseService, account.response.organization.id, [
    "ouvrier",
  ]);

  const response = await request(getHttpServer())
    .delete(`/api/organizations/${account.response.organization.id}/users/${user.id}/roles/ouvrier`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .expect(400);

  expect(parseApiErrorResponse(response).message).toContain(
    "Cette combinaison de rôles n'est pas autorisée.",
  );
  expect(await findPersistedRoleCodes(databaseService, user.id)).toStrictEqual(["ouvrier"]);
});

it("rejects role management when requester is not organization admin", async () => {
  const account = await createRegisteredAccount();
  const user = await createOrganizationUser(databaseService, account.response.organization.id, [
    "ouvrier",
  ]);

  await removeUserRoles(databaseService, account.response.user.id);

  await request(getHttpServer())
    .get(`/api/organizations/${account.response.organization.id}/users/${user.id}/roles`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .expect(403);
});

it("rejects role management across organizations", async () => {
  const firstAccount = await createRegisteredAccount();
  const secondAccount = await createRegisteredAccount();
  const secondOrganizationUser = await createOrganizationUser(
    databaseService,
    secondAccount.response.organization.id,
    ["ouvrier"],
  );

  await request(getHttpServer())
    .get(
      `/api/organizations/${secondAccount.response.organization.id}/users/${secondOrganizationUser.id}/roles`,
    )
    .set("Authorization", `Bearer ${firstAccount.response.accessToken}`)
    .expect(403);
});

it("refuse la suppression d'un role non attribue a l'utilisateur", async () => {
  const account = await createRegisteredAccount();
  const user = await createOrganizationUser(databaseService, account.response.organization.id, [
    "ouvrier",
  ]);

  const response = await request(getHttpServer())
    .delete(
      `/api/organizations/${account.response.organization.id}/users/${user.id}/roles/architecte`,
    )
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .expect(404);

  expect(parseApiErrorResponse(response).message).toContain(
    "Ce rôle n'est pas associé à cet utilisateur.",
  );
  expect(await findPersistedRoleCodes(databaseService, user.id)).toStrictEqual(["ouvrier"]);
});

it("refuse les requetes non authentifiees sur les endpoints de roles", async () => {
  const account = await createRegisteredAccount();
  const user = await createOrganizationUser(databaseService, account.response.organization.id, [
    "ouvrier",
  ]);

  const rolesUrl = `/api/organizations/${account.response.organization.id}/users/${user.id}/roles`;

  await request(getHttpServer()).get(rolesUrl).expect(401);
  await request(getHttpServer()).post(rolesUrl).send({ roleCode: "chef_chantier" }).expect(401);
  await request(getHttpServer()).delete(`${rolesUrl}/ouvrier`).expect(401);
});

it("refuse l'ajout de role par un utilisateur non administrateur", async () => {
  const account = await createRegisteredAccount();
  const user = await createOrganizationUser(databaseService, account.response.organization.id, [
    "ouvrier",
  ]);

  await removeUserRoles(databaseService, account.response.user.id);

  await request(getHttpServer())
    .post(`/api/organizations/${account.response.organization.id}/users/${user.id}/roles`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ roleCode: "chef_chantier" })
    .expect(403);

  expect(await findPersistedRoleCodes(databaseService, user.id)).toStrictEqual(["ouvrier"]);
});

it("refuse la suppression de role par un utilisateur non administrateur", async () => {
  const account = await createRegisteredAccount();
  const user = await createOrganizationUser(databaseService, account.response.organization.id, [
    "chef_chantier",
    "droniste",
  ]);

  await removeUserRoles(databaseService, account.response.user.id);

  await request(getHttpServer())
    .delete(
      `/api/organizations/${account.response.organization.id}/users/${user.id}/roles/droniste`,
    )
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .expect(403);

  expect(await findPersistedRoleCodes(databaseService, user.id)).toStrictEqual([
    "chef_chantier",
    "droniste",
  ]);
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

function parseUserRolesResponse(response: Response): OrganizationUserRolesResponseDto {
  return JSON.parse(response.text) as OrganizationUserRolesResponseDto;
}
