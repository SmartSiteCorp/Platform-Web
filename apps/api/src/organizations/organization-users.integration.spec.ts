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
  type CreatedOrganizationUser,
} from "./organization-user-management-test-helpers.js";
import {
  deleteCreatedOrganizations,
  removeUserRoles,
} from "./organization-invitations-test-helpers.js";
import { setUserRoles } from "../sites/sites-test-helpers.js";
import type {
  OrganizationUserResponseDto,
  OrganizationUsersResponseDto,
} from "./organizations.dto.js";
import {
  createRegisterRequest,
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

it("returns organization users with their roles", async () => {
  const account = await createRegisteredAccount();
  const organizationUser = await createTestOrganizationUser(account.response.organization.id);

  const response = await request(getHttpServer())
    .get(`/api/organizations/${account.response.organization.id}/users`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .expect(200);
  const responseBody = parseOrganizationUsersResponse(response);
  const createdUser = getResponseUser(responseBody, organizationUser.id);
  const adminUser = getResponseUser(responseBody, account.response.user.id);

  expect(responseBody.organizationId).toBe(account.response.organization.id);
  expect(createdUser.email.startsWith("organization-user-")).toBe(true);
  expect(createdUser).toMatchObject({
    firstName: "Armand",
    id: organizationUser.id,
    lastName: "Braud",
    roleCodes: ["chef_chantier", "droniste"],
    status: "active",
  });
  expect(adminUser).toMatchObject({
    email: account.response.user.email,
    firstName: account.response.user.firstName,
    id: account.response.user.id,
    lastName: account.response.user.lastName,
    roleCodes: ["administrateur"],
    status: "active",
  });
});

it("rejects organization users listing when requester is not organization admin", async () => {
  const account = await createRegisteredAccount();

  await removeUserRoles(databaseService, account.response.user.id);

  await request(getHttpServer())
    .get(`/api/organizations/${account.response.organization.id}/users`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .expect(403);
});

it("allows a construction manager to list organization users", async () => {
  const account = await createRegisteredAccount();
  const organizationUser = await createTestOrganizationUser(account.response.organization.id);

  await setUserRoles(databaseService, account.response.user.id, ["chef_chantier"]);

  const response = await request(getHttpServer())
    .get(`/api/organizations/${account.response.organization.id}/users`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .expect(200);
  const responseBody = parseOrganizationUsersResponse(response);

  expect(getResponseUser(responseBody, organizationUser.id).id).toBe(organizationUser.id);
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

function createTestOrganizationUser(organizationId: string): Promise<CreatedOrganizationUser> {
  return createOrganizationUser(databaseService, organizationId, ["chef_chantier", "droniste"]);
}

function parseOrganizationUsersResponse(response: Response): OrganizationUsersResponseDto {
  return JSON.parse(response.text) as OrganizationUsersResponseDto;
}

function getResponseUser(
  responseBody: OrganizationUsersResponseDto,
  userId: string,
): OrganizationUserResponseDto {
  const user = responseBody.users.find((organizationUser) => organizationUser.id === userId);

  if (!user) {
    throw new Error(`Expected user ${userId} in organization users response.`);
  }

  return user;
}
