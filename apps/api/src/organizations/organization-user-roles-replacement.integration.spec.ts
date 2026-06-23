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
  createOrganizationUser,
  findLatestUserRolesAuditLog,
  findPersistedRoleCodes,
} from "./organization-user-management-test-helpers.js";
import { deleteCreatedOrganizations } from "./organization-invitations-test-helpers.js";
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

it("replaces assignable user roles in one request", async () => {
  const account = await createRegisteredAccount();
  const user = await createOrganizationUser(databaseService, account.response.organization.id, [
    "chef_chantier",
    "droniste",
  ]);

  const response = await request(getHttpServer())
    .put(`/api/organizations/${account.response.organization.id}/users/${user.id}/roles`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ roleCodes: ["architecte"] })
    .expect(200);

  expect(parseUserRolesResponse(response)).toStrictEqual({
    organizationId: account.response.organization.id,
    roleCodes: ["architecte"],
    userId: user.id,
  });
  expect(await findPersistedRoleCodes(databaseService, user.id)).toStrictEqual(["architecte"]);
});

it("preserves organization admin role during assignable role replacement", async () => {
  const account = await createRegisteredAccount();

  const response = await request(getHttpServer())
    .put(
      `/api/organizations/${account.response.organization.id}/users/${account.response.user.id}/roles`,
    )
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ roleCodes: ["chef_chantier"] })
    .expect(200);

  expect(parseUserRolesResponse(response)).toStrictEqual({
    organizationId: account.response.organization.id,
    roleCodes: ["administrateur", "chef_chantier"],
    userId: account.response.user.id,
  });
  expect(await findPersistedRoleCodes(databaseService, account.response.user.id)).toStrictEqual([
    "administrateur",
    "chef_chantier",
  ]);
});

it("rejects incompatible replacement role combinations", async () => {
  const account = await createRegisteredAccount();
  const user = await createOrganizationUser(databaseService, account.response.organization.id, [
    "ouvrier",
  ]);

  const response = await request(getHttpServer())
    .put(`/api/organizations/${account.response.organization.id}/users/${user.id}/roles`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ roleCodes: ["ouvrier", "droniste"] })
    .expect(400);

  expect(parseApiErrorResponse(response).message).toContain(
    "Cette combinaison de rôles n'est pas autorisée.",
  );
  expect(await findPersistedRoleCodes(databaseService, user.id)).toStrictEqual(["ouvrier"]);
});

it("rejects manual organization admin role replacement", async () => {
  const account = await createRegisteredAccount();
  const user = await createOrganizationUser(databaseService, account.response.organization.id, [
    "chef_chantier",
  ]);

  const response = await request(getHttpServer())
    .put(`/api/organizations/${account.response.organization.id}/users/${user.id}/roles`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ roleCodes: ["administrateur"] })
    .expect(400);

  expect(parseApiErrorResponse(response).message).toContain(
    "Ce rôle ne peut pas être attribué manuellement.",
  );
  expect(await findPersistedRoleCodes(databaseService, user.id)).toStrictEqual(["chef_chantier"]);
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

it("journalise le remplacement de roles dans organization_audit_logs", async () => {
  const account = await createRegisteredAccount();
  const user = await createOrganizationUser(databaseService, account.response.organization.id, [
    "chef_chantier",
    "droniste",
  ]);

  await request(getHttpServer())
    .put(`/api/organizations/${account.response.organization.id}/users/${user.id}/roles`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ roleCodes: ["architecte"] })
    .expect(200);

  const auditLog = await findLatestUserRolesAuditLog(
    databaseService,
    account.response.organization.id,
    user.id,
  );

  expect(auditLog.action).toBe("organization.user_roles_updated");
  expect(auditLog.actor_user_id).toBe(account.response.user.id);
  expect(auditLog.organization_id).toBe(account.response.organization.id);
  expect(auditLog.changed_fields).toStrictEqual(["roleCodes"]);
  expect(auditLog.metadata).toStrictEqual({
    nextRoleCodes: ["architecte"],
    previousRoleCodes: ["chef_chantier", "droniste"],
    targetUserId: user.id,
  });
});

function parseUserRolesResponse(response: Response): OrganizationUserRolesResponseDto {
  return JSON.parse(response.text) as OrganizationUserRolesResponseDto;
}
