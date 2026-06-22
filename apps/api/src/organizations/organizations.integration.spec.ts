import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import type { Server } from "node:http";
import request from "supertest";
import { afterAll, afterEach, beforeAll, expect, it } from "vitest";

import { configureHttpApp } from "../app-http.js";
import { AppModule } from "../app.module.js";
import type { RegisterResponseDto } from "../auth/auth.dto.js";
import type { AccessTokenPayload } from "../auth/auth.types.js";
import { DatabaseService } from "../database/database.service.js";
import {
  createRegisterRequest,
  parseApiErrorResponse,
  parseOrganizationResponse,
  parseRegisterResponse,
  type OrganizationAuditLogDatabaseRow,
  type OrganizationDatabaseRow,
  type RegisteredTestAccount,
} from "./organizations-test-helpers.js";

const createdEmails = new Set<string>();
let app: INestApplication<Server>;
let databaseService: DatabaseService;
let jwtService: JwtService;

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
  jwtService = app.get(JwtService);
});

afterEach(async () => {
  for (const email of createdEmails) {
    await deleteRegisteredAccount(email);
  }

  createdEmails.clear();
});

afterAll(async () => {
  await app.close();
});

it("returns the authenticated admin organization", async () => {
  const account = await createRegisteredAccount();

  const response = await request(getHttpServer())
    .get(`/api/organizations/${account.response.organization.id}`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .expect(200);
  const responseBody = parseOrganizationResponse(response);

  expect(responseBody).toMatchObject({
    email: account.request.email,
    id: account.response.organization.id,
    name: account.request.organizationName,
  });
});

it("updates and persists organization information", async () => {
  const account = await createRegisteredAccount();

  const response = await request(getHttpServer())
    .put(`/api/organizations/${account.response.organization.id}`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({
      address: " 12 rue des Artisans, 75001 Paris ",
      email: "CONTACT@SMARTSITE.FR",
      name: " Stern Tech Renovation ",
      phone: " +33123456789 ",
    })
    .expect(200);
  const responseBody = parseOrganizationResponse(response);
  const databaseRow = await findOrganization(account.response.organization.id);

  expect(responseBody).toMatchObject({
    address: "12 rue des Artisans, 75001 Paris",
    email: "contact@smartsite.fr",
    name: "Stern Tech Renovation",
    phone: "+33123456789",
  });
  expect(databaseRow).toStrictEqual({
    address: "12 rue des Artisans, 75001 Paris",
    email: "contact@smartsite.fr",
    name: "Stern Tech Renovation",
    phone: "+33123456789",
  });
});

it("records organization updates without sensitive values", async () => {
  const account = await createRegisteredAccount();

  await request(getHttpServer())
    .put(`/api/organizations/${account.response.organization.id}`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({
      address: "12 rue des Artisans, 75001 Paris",
      email: "contact@smartsite.fr",
      name: "Stern Tech Renovation",
      phone: "+33123456789",
    })
    .expect(200);
  const auditLog = await findLatestOrganizationAuditLog(account.response.organization.id);
  const serializedAuditLog = JSON.stringify(auditLog);

  expect(auditLog).toStrictEqual({
    action: "organization.updated",
    actor_user_id: account.response.user.id,
    changed_fields: ["name", "email", "phone", "address"],
    metadata: {
      changedFields: ["name", "email", "phone", "address"],
    },
  });
  expect(serializedAuditLog).not.toContain(account.request.password);
  expect(serializedAuditLog).not.toContain(account.response.accessToken);
});

it("rejects organization access without JWT", async () => {
  const account = await createRegisteredAccount();

  await request(getHttpServer())
    .get(`/api/organizations/${account.response.organization.id}`)
    .expect(401);
});

it("rejects organization updates without JWT", async () => {
  const account = await createRegisteredAccount();

  await request(getHttpServer())
    .put(`/api/organizations/${account.response.organization.id}`)
    .send({
      email: "contact@smartsite.fr",
      name: "Stern Tech",
    })
    .expect(401);
});

it("rejects organization access with an expired JWT", async () => {
  const account = await createRegisteredAccount();
  const expiredAccessToken = await signExpiredAccessToken(account.response);

  const response = await request(getHttpServer())
    .get(`/api/organizations/${account.response.organization.id}`)
    .set("Authorization", `Bearer ${expiredAccessToken}`)
    .expect(401);
  const responseBody = parseApiErrorResponse(response);

  expect(responseBody.message).toContain("Le token d'authentification est invalide.");
});

it("rejects access to another organization", async () => {
  const firstAccount = await createRegisteredAccount();
  const secondAccount = await createRegisteredAccount();

  await request(getHttpServer())
    .get(`/api/organizations/${secondAccount.response.organization.id}`)
    .set("Authorization", `Bearer ${firstAccount.response.accessToken}`)
    .expect(403);
});

it("rejects updates to another organization", async () => {
  const firstAccount = await createRegisteredAccount();
  const secondAccount = await createRegisteredAccount();

  await request(getHttpServer())
    .put(`/api/organizations/${secondAccount.response.organization.id}`)
    .set("Authorization", `Bearer ${firstAccount.response.accessToken}`)
    .send({
      email: "contact@smartsite.fr",
      name: "Stern Tech",
    })
    .expect(403);
});

it("rejects users whose admin role was removed", async () => {
  const account = await createRegisteredAccount();

  await removeUserRoles(account.response.user.id);

  await request(getHttpServer())
    .put(`/api/organizations/${account.response.organization.id}`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({
      email: "contact@smartsite.fr",
      name: "Stern Tech",
    })
    .expect(403);
});

it("rejects invalid organization payloads", async () => {
  const account = await createRegisteredAccount();

  const response = await request(getHttpServer())
    .put(`/api/organizations/${account.response.organization.id}`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({
      email: "email invalide",
      name: "",
    })
    .expect(400);
  const responseBody = parseApiErrorResponse(response);

  expect(responseBody.message).toContain("Le nom d'entreprise est obligatoire.");
  expect(responseBody.message).toContain("L'email doit être valide.");
});

it("rejects organization payloads above maximum lengths", async () => {
  const account = await createRegisteredAccount();

  const response = await request(getHttpServer())
    .put(`/api/organizations/${account.response.organization.id}`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({
      address: "A".repeat(501),
      email: `${"a".repeat(309)}@example.com`,
      name: "A".repeat(181),
      phone: "1".repeat(41),
    })
    .expect(400);
  const responseBody = parseApiErrorResponse(response);

  expect(responseBody.message).toContain("Le nom d'entreprise est trop long.");
  expect(responseBody.message).toContain("L'email est trop long.");
  expect(responseBody.message).toContain("Le téléphone est trop long.");
  expect(responseBody.message).toContain("L'adresse est trop longue.");
});

function getHttpServer(): Server {
  return app.getHttpServer();
}

async function createRegisteredAccount(): Promise<RegisteredTestAccount> {
  const registrationRequest = createRegisterRequest();
  createdEmails.add(registrationRequest.email);

  const response = await request(getHttpServer())
    .post("/api/auth/register")
    .send(registrationRequest)
    .expect(201);

  return {
    request: registrationRequest,
    response: parseRegisterResponse(response),
  };
}

async function findOrganization(organizationId: string): Promise<OrganizationDatabaseRow> {
  const result = await databaseService.query<OrganizationDatabaseRow>(
    `
      SELECT name, email, phone, address
      FROM organizations
      WHERE id = $1
    `,
    [organizationId],
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error(`Organization not found: ${organizationId}.`);
  }

  return row;
}

async function findLatestOrganizationAuditLog(
  organizationId: string,
): Promise<OrganizationAuditLogDatabaseRow> {
  const result = await databaseService.query<OrganizationAuditLogDatabaseRow>(
    `
      SELECT action, actor_user_id, changed_fields, metadata
      FROM organization_audit_logs
      WHERE organization_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [organizationId],
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error(`Organization audit log not found: ${organizationId}.`);
  }

  return row;
}

async function removeUserRoles(userId: string): Promise<void> {
  await databaseService.query("DELETE FROM user_roles WHERE user_id = $1", [userId]);
}

function signExpiredAccessToken(account: RegisterResponseDto): Promise<string> {
  const expiredPayload: AccessTokenPayload = {
    email: account.user.email,
    organizationId: account.organization.id,
    roles: account.user.roles,
    sub: account.user.id,
  };

  // Le token est volontairement expiré pour valider la protection des routes privées.
  return jwtService.signAsync(expiredPayload, { expiresIn: -1 });
}

async function deleteRegisteredAccount(email: string): Promise<void> {
  await databaseService.query(
    `
      WITH deleted_users AS (
        DELETE FROM users
        WHERE email = $1
        RETURNING organization_id
      )
      DELETE FROM organizations
      WHERE id IN (SELECT organization_id FROM deleted_users)
    `,
    [email],
  );
}
