import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { verify as verifyPasswordHash } from "argon2";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { QueryResultRow } from "pg";
import request, { type Response } from "supertest";
import { afterAll, afterEach, beforeAll, expect, it } from "vitest";

import { configureHttpApp } from "../app-http.js";
import { AppModule } from "../app.module.js";
import { DatabaseService } from "../database/database.service.js";
import type { AccessTokenPayload } from "./auth.types.js";
import type { RegisterResponseDto } from "./auth.dto.js";

interface RegistrationDatabaseRow extends QueryResultRow {
  readonly organization_id: string;
  readonly organization_name: string;
  readonly organization_email: string | null;
  readonly user_id: string;
  readonly user_email: string;
  readonly user_status: string;
  readonly password_hash: string;
  readonly role_code: string;
}

interface CountRow extends QueryResultRow {
  readonly count: number;
}

interface ApiValidationError {
  readonly message: readonly string[];
  readonly statusCode: number;
}

interface RegisterPayload {
  readonly organizationName: string;
  readonly email: string;
  readonly password: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly phone?: string;
}

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

it("creates the organization, admin user, role assignment, password hash and JWT", async () => {
  const registrationRequest = createRegisterRequest();
  createdEmails.add(registrationRequest.email);

  const response = await request(getHttpServer())
    .post("/api/auth/register")
    .send(registrationRequest)
    .expect(201);
  const responseBody = parseRegisterResponse(response);

  expect(responseBody).toMatchObject({
    organization: {
      email: registrationRequest.email,
      name: registrationRequest.organizationName,
    },
    tokenType: "Bearer",
    user: {
      email: registrationRequest.email,
      firstName: registrationRequest.firstName,
      lastName: registrationRequest.lastName,
      roles: ["administrateur"],
      status: "active",
    },
  });
  expect(responseBody.accessToken.length).toBeGreaterThan(20);

  const databaseRow = await findRegisteredAccount(registrationRequest.email);

  expect(databaseRow).toStrictEqual({
    organization_email: registrationRequest.email,
    organization_id: responseBody.organization.id,
    organization_name: registrationRequest.organizationName,
    password_hash: databaseRow.password_hash,
    role_code: "administrateur",
    user_email: registrationRequest.email,
    user_id: responseBody.user.id,
    user_status: "active",
  });
  expect(databaseRow.password_hash).not.toBe(registrationRequest.password);
  await expect(
    verifyPasswordHash(databaseRow.password_hash, registrationRequest.password),
  ).resolves.toBe(true);

  await expect(
    jwtService.verifyAsync<AccessTokenPayload>(responseBody.accessToken),
  ).resolves.toMatchObject({
    email: registrationRequest.email,
    organizationId: responseBody.organization.id,
    roles: ["administrateur"],
    sub: responseBody.user.id,
  });
});

it("rejects invalid email addresses", async () => {
  const response = await request(getHttpServer())
    .post("/api/auth/register")
    .send(createRegisterRequest({ email: "email invalide" }))
    .expect(400);
  const responseBody = parseValidationError(response);

  expect(responseBody.message).toContain("L'email doit être valide.");
});

it("rejects missing organization names", async () => {
  const response = await request(getHttpServer())
    .post("/api/auth/register")
    .send(createRegisterRequest({ organizationName: "" }))
    .expect(400);
  const responseBody = parseValidationError(response);

  expect(responseBody.message).toContain("Le nom d'entreprise est obligatoire.");
});

it("rejects weak passwords", async () => {
  const response = await request(getHttpServer())
    .post("/api/auth/register")
    .send(createRegisterRequest({ password: "password" }))
    .expect(400);
  const responseBody = parseValidationError(response);

  expect(responseBody.message).toContain("Le mot de passe doit contenir au moins 12 caractères.");
});

it("rejects duplicate emails without creating another account", async () => {
  const registrationRequest = createRegisterRequest();
  createdEmails.add(registrationRequest.email);

  await request(getHttpServer()).post("/api/auth/register").send(registrationRequest).expect(201);

  const response = await request(getHttpServer())
    .post("/api/auth/register")
    .send(createDuplicateRegisterRequest(registrationRequest))
    .expect(409);
  const responseBody = parseValidationError(response);
  const accountCount = await countRegisteredAccounts(registrationRequest.email);

  expect(responseBody.message).toContain("Un compte existe déjà avec cet email.");
  expect(accountCount).toBe(1);
});

function getHttpServer(): Server {
  return app.getHttpServer();
}

async function findRegisteredAccount(email: string): Promise<RegistrationDatabaseRow> {
  const result = await databaseService.query<RegistrationDatabaseRow>(
    `
      SELECT
        organizations.id AS organization_id,
        organizations.name AS organization_name,
        organizations.email AS organization_email,
        users.id AS user_id,
        users.email AS user_email,
        users.status AS user_status,
        users.password_hash,
        roles.code AS role_code
      FROM users
      INNER JOIN organizations ON organizations.id = users.organization_id
      INNER JOIN user_roles ON user_roles.user_id = users.id
      INNER JOIN roles ON roles.id = user_roles.role_id
      WHERE users.email = $1
    `,
    [email],
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error(`Registered account not found for ${email}.`);
  }

  return row;
}

async function countRegisteredAccounts(email: string): Promise<number> {
  const result = await databaseService.query<CountRow>(
    "SELECT COUNT(*)::int AS count FROM users WHERE email = $1",
    [email],
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error("Account count query failed.");
  }

  return row.count;
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

function createRegisterRequest(overrides: Partial<RegisterPayload> = {}): RegisterPayload {
  const identifier = randomUUID();

  return {
    email: `registration-${identifier}@smartsite.test`,
    firstName: "Andreea",
    lastName: "Rauta",
    organizationName: "Stern Tech",
    password: "SmartSite.2026",
    ...overrides,
  };
}

function createDuplicateRegisterRequest(registrationRequest: RegisterPayload): RegisterPayload {
  return {
    ...registrationRequest,
    organizationName: "Organisation doublon",
  };
}

function parseRegisterResponse(response: Response): RegisterResponseDto {
  return JSON.parse(response.text) as RegisterResponseDto;
}

function parseValidationError(response: Response): ApiValidationError {
  return JSON.parse(response.text) as ApiValidationError;
}
