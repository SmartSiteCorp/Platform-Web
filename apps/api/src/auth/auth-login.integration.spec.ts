import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import request, { type Response } from "supertest";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";

import { configureHttpApp } from "../app-http.js";
import { AppModule } from "../app.module.js";
import { DatabaseService } from "../database/database.service.js";
import { getJwtAccessExpiresInSeconds } from "../shared/config/environment.js";
import type { AccessTokenPayload } from "./auth.types.js";
import type { LoginResponseDto, RegisterResponseDto } from "./auth.dto.js";

interface RegisterPayload {
  readonly organizationName: string;
  readonly email: string;
  readonly password: string;
  readonly firstName: string;
  readonly lastName: string;
}

interface RegisteredTestAccount {
  readonly request: RegisterPayload;
  readonly response: RegisterResponseDto;
}

interface ApiErrorResponse {
  readonly message: readonly string[];
  readonly statusCode: number;
}

interface AccessTokenWithTimestamps extends AccessTokenPayload {
  readonly exp: number;
  readonly iat: number;
}

const invalidCredentialsMessage = "Email ou mot de passe incorrect.";
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

it("logs in an existing user and returns the account session", async () => {
  const account = await createRegisteredAccount();

  const response = await request(getHttpServer())
    .post("/api/auth/login")
    .send({
      email: account.request.email.toUpperCase(),
      password: account.request.password,
    })
    .expect(200);
  const responseBody = parseLoginResponse(response);

  expect(responseBody).toMatchObject({
    organization: {
      id: account.response.organization.id,
      name: account.request.organizationName,
    },
    tokenType: "Bearer",
    user: {
      email: account.request.email,
      id: account.response.user.id,
      roles: ["administrateur"],
    },
  });
  expect(responseBody.accessToken.length).toBeGreaterThan(20);

  const accessTokenPayload = await jwtService.verifyAsync<AccessTokenWithTimestamps>(
    responseBody.accessToken,
  );

  expect(accessTokenPayload).toMatchObject({
    email: account.request.email,
    organizationId: account.response.organization.id,
    roles: ["administrateur"],
    sub: account.response.user.id,
  });
  expect(accessTokenPayload.exp - accessTokenPayload.iat).toBe(getJwtAccessExpiresInSeconds());
});

it("rejects login when the email does not exist", async () => {
  const response = await request(getHttpServer())
    .post("/api/auth/login")
    .send({
      email: `missing-${randomUUID()}@smartsite.test`,
      password: "SmartSite.2026",
    })
    .expect(401);
  const responseBody = parseApiErrorResponse(response);

  expect(responseBody.message).toContain(invalidCredentialsMessage);
});

it("rejects login when the password is incorrect", async () => {
  const account = await createRegisteredAccount();

  const response = await request(getHttpServer())
    .post("/api/auth/login")
    .send({
      email: account.request.email,
      password: "WrongPassword.2026",
    })
    .expect(401);
  const responseBody = parseApiErrorResponse(response);

  expect(responseBody.message).toContain(invalidCredentialsMessage);
});

it("keeps authentication errors free from passwords and tokens", async () => {
  const account = await createRegisteredAccount();
  const submittedPassword = "WrongPassword.2026";
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

  try {
    const response = await request(getHttpServer())
      .post("/api/auth/login")
      .send({
        email: account.request.email,
        password: submittedPassword,
      })
      .expect(401);
    const responseBody = parseApiErrorResponse(response);

    expect(responseBody.message).toStrictEqual([invalidCredentialsMessage]);
    expect(response.text).not.toContain(submittedPassword);
    expect(response.text).not.toContain("accessToken");
    expect(errorSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  } finally {
    errorSpy.mockRestore();
    logSpy.mockRestore();
    warnSpy.mockRestore();
  }
});

it("rejects invalid login payloads", async () => {
  const response = await request(getHttpServer())
    .post("/api/auth/login")
    .send({
      email: "email invalide",
      password: "",
    })
    .expect(400);
  const responseBody = parseApiErrorResponse(response);

  expect(responseBody.message).toContain("L'email doit être valide.");
  expect(responseBody.message).toContain("Le mot de passe est obligatoire.");
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

function createRegisterRequest(): RegisterPayload {
  const identifier = randomUUID();

  return {
    email: `login-${identifier}@smartsite.test`,
    firstName: "Andreea",
    lastName: "Rauta",
    organizationName: "Stern Tech",
    password: "SmartSite.2026",
  };
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

function parseLoginResponse(response: Response): LoginResponseDto {
  return JSON.parse(response.text) as LoginResponseDto;
}

function parseRegisterResponse(response: Response): RegisterResponseDto {
  return JSON.parse(response.text) as RegisterResponseDto;
}

function parseApiErrorResponse(response: Response): ApiErrorResponse {
  return JSON.parse(response.text) as ApiErrorResponse;
}
