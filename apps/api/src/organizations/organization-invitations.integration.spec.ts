import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { Server } from "node:http";
import request from "supertest";
import { afterAll, afterEach, beforeAll, expect, it } from "vitest";

import { configureHttpApp } from "../app-http.js";
import { AppModule } from "../app.module.js";
import { DatabaseService } from "../database/database.service.js";
import {
  acceptInvitation,
  createAcceptInvitationRequest,
  createInvitation,
  createInvitationEmail,
  createRegisteredAccountForInvitationTests,
  deleteCreatedOrganizations,
  expireInvitation,
  findInvitation,
  findInvitationEmailAuditLogs,
  findInvitedUser,
  hashInvitationToken,
  removeUserRoles,
  verifyInvitedPasswordHash,
} from "./organization-invitations-test-helpers.js";
import { organizationInvitationEmailAuditAction } from "./organization-invitations.types.js";
import { parseApiErrorResponse, type RegisteredTestAccount } from "./organizations-test-helpers.js";

const createdOrganizationIds = new Set<string>();
const expectedInvitationLifetimeInSeconds = 3600;
const originalEnvironment = { ...process.env };
let app: INestApplication<Server>;
let databaseService: DatabaseService;

beforeAll(async () => {
  process.env.AUTH_REGISTER_RATE_LIMIT_LIMIT = "100";
  process.env.AUTH_REGISTER_RATE_LIMIT_TTL_SECONDS = "60";
  process.env.EMAIL_PROVIDER = "log";
  process.env.ORGANIZATION_INVITATION_EXPIRES_IN_SECONDS =
    expectedInvitationLifetimeInSeconds.toString();
  delete process.env.EMAIL_HTTP_ENDPOINT;

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
  process.env = { ...originalEnvironment };
});

it("creates a secure organization invitation with selected roles", async () => {
  const account = await createRegisteredAccount();
  const invitedEmail = createInvitationEmail();

  const responseBody = await createInvitation(getHttpServer(), account, {
    email: invitedEmail.toUpperCase(),
    roleCodes: ["chef_chantier", "droniste"],
  });
  const invitation = await findInvitation(databaseService, responseBody.id);

  expect(responseBody).toMatchObject({
    email: invitedEmail,
    organizationId: account.response.organization.id,
  });
  expect(responseBody.roleCodes).toStrictEqual(["chef_chantier", "droniste"]);
  expect(responseBody.token.length).toBeGreaterThan(20);
  expect(invitation).toMatchObject({
    accepted_at: null,
    accepted_by: null,
    email: invitedEmail,
    role_codes: ["chef_chantier", "droniste"],
    token_hash: hashInvitationToken(responseBody.token),
  });
  expect(invitation.expires_at.getTime() - invitation.created_at.getTime()).toBeGreaterThanOrEqual(
    (expectedInvitationLifetimeInSeconds - 10) * 1000,
  );
  expect(invitation.expires_at.getTime() - invitation.created_at.getTime()).toBeLessThanOrEqual(
    (expectedInvitationLifetimeInSeconds + 10) * 1000,
  );
  expect(invitation.token_hash).not.toBe(responseBody.token);

  const auditLogs = await findInvitationEmailAuditLogs(databaseService, responseBody.id);
  const auditLog = getRequiredAuditLog(auditLogs);

  expect(auditLog).toMatchObject({
    action: organizationInvitationEmailAuditAction,
    actor_user_id: account.response.user.id,
    changed_fields: [],
    organization_id: account.response.organization.id,
    metadata: {
      invitationId: responseBody.id,
      provider: "log",
      roleCodes: ["chef_chantier", "droniste"],
      status: "sent",
    },
  });
  expect(JSON.stringify(auditLog.metadata)).not.toContain(responseBody.token);
});

it("rejects incompatible invitation role combinations", async () => {
  const account = await createRegisteredAccount();

  const response = await request(getHttpServer())
    .post(`/api/organizations/${account.response.organization.id}/invitations`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({
      email: createInvitationEmail(),
      roleCodes: ["ouvrier", "droniste"],
    })
    .expect(400);

  expect(parseApiErrorResponse(response).message).toContain(
    "Cette combinaison de rôles n'est pas autorisée.",
  );
});

it("rejects invitation creation without authentication", async () => {
  const account = await createRegisteredAccount();

  await request(getHttpServer())
    .post(`/api/organizations/${account.response.organization.id}/invitations`)
    .send({
      email: createInvitationEmail(),
      roleCodes: ["ouvrier"],
    })
    .expect(401);
});

it("rejects invitation creation when the user is not organization admin", async () => {
  const account = await createRegisteredAccount();

  await removeUserRoles(databaseService, account.response.user.id);

  await request(getHttpServer())
    .post(`/api/organizations/${account.response.organization.id}/invitations`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({
      email: createInvitationEmail(),
      roleCodes: ["ouvrier"],
    })
    .expect(403);
});

it("rejects member emails and duplicate active invitations", async () => {
  const account = await createRegisteredAccount();
  const invitedEmail = createInvitationEmail();

  const memberResponse = await request(getHttpServer())
    .post(`/api/organizations/${account.response.organization.id}/invitations`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({
      email: account.request.email,
      roleCodes: ["ouvrier"],
    })
    .expect(409);
  const memberError = parseApiErrorResponse(memberResponse);

  await createInvitation(getHttpServer(), account, {
    email: invitedEmail,
    roleCodes: ["architecte"],
  });

  const duplicateResponse = await request(getHttpServer())
    .post(`/api/organizations/${account.response.organization.id}/invitations`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({
      email: invitedEmail,
      roleCodes: ["architecte"],
    })
    .expect(409);
  const duplicateError = parseApiErrorResponse(duplicateResponse);

  expect(memberError.message).toContain("Cet email est déjà membre de l'organisation.");
  expect(duplicateError.message).toContain("Une invitation active existe déjà pour cet email.");
});

it("allows creating a new invitation after the previous one expired", async () => {
  const account = await createRegisteredAccount();
  const invitedEmail = createInvitationEmail();
  const expiredInvitation = await createInvitation(getHttpServer(), account, {
    email: invitedEmail,
    roleCodes: ["architecte"],
  });

  await expireInvitation(databaseService, expiredInvitation.id);

  const newInvitation = await createInvitation(getHttpServer(), account, {
    email: invitedEmail,
    roleCodes: ["architecte"],
  });

  expect(newInvitation.id).not.toBe(expiredInvitation.id);
  expect(newInvitation.email).toBe(invitedEmail);
});

it("accepts an invitation and creates the user in the organization", async () => {
  const account = await createRegisteredAccount();
  const invitedEmail = createInvitationEmail();
  const invitation = await createInvitation(getHttpServer(), account, {
    email: invitedEmail,
    roleCodes: ["ouvrier"],
  });

  const responseBody = await acceptInvitation(getHttpServer(), {
    email: invitedEmail.toUpperCase(),
    firstName: "Alex",
    lastName: "Fraioli",
    password: "SmartSite.2026",
    phone: "+33123456789",
    token: invitation.token,
  });
  const invitedUser = await findInvitedUser(databaseService, responseBody.user.id);
  const acceptedInvitation = await findInvitation(databaseService, invitation.id);

  expect(responseBody).toMatchObject({
    organization: {
      id: account.response.organization.id,
      name: account.response.organization.name,
    },
    tokenType: "Bearer",
    user: {
      email: invitedEmail,
      firstName: "Alex",
      lastName: "Fraioli",
      organizationId: account.response.organization.id,
      phone: "+33123456789",
      roles: ["ouvrier"],
    },
  });
  expect(responseBody.accessToken.length).toBeGreaterThan(20);
  expect(invitedUser).toMatchObject({
    email: invitedEmail,
    organization_id: account.response.organization.id,
    role_codes: ["ouvrier"],
  });
  expect(await verifyInvitedPasswordHash(invitedUser.password_hash, "SmartSite.2026")).toBe(true);
  expect(acceptedInvitation.accepted_by).toBe(responseBody.user.id);
  expect(acceptedInvitation.accepted_at).toBeInstanceOf(Date);
});

it("rejects invalid, expired and already accepted invitations", async () => {
  const account = await createRegisteredAccount();
  const expiredInvitation = await createInvitation(getHttpServer(), account, {
    email: createInvitationEmail(),
    roleCodes: ["ouvrier"],
  });
  const acceptedInvitation = await createInvitation(getHttpServer(), account, {
    email: createInvitationEmail(),
    roleCodes: ["architecte"],
  });

  await expireInvitation(databaseService, expiredInvitation.id);

  const invalidResponse = await request(getHttpServer())
    .post("/api/organizations/invitations/accept")
    .send(createAcceptInvitationRequest("invalid-token", createInvitationEmail()))
    .expect(401);
  const expiredResponse = await request(getHttpServer())
    .post("/api/organizations/invitations/accept")
    .send(createAcceptInvitationRequest(expiredInvitation.token, expiredInvitation.email))
    .expect(400);

  await acceptInvitation(
    getHttpServer(),
    createAcceptInvitationRequest(acceptedInvitation.token, acceptedInvitation.email),
  );

  const alreadyAcceptedResponse = await request(getHttpServer())
    .post("/api/organizations/invitations/accept")
    .send(createAcceptInvitationRequest(acceptedInvitation.token, acceptedInvitation.email))
    .expect(409);

  expect(parseApiErrorResponse(invalidResponse).message).toContain("L'invitation est invalide.");
  expect(parseApiErrorResponse(expiredResponse).message).toContain("L'invitation a expiré.");
  expect(parseApiErrorResponse(alreadyAcceptedResponse).message).toContain(
    "Cette invitation a déjà été acceptée.",
  );
});

function getHttpServer(): Server {
  return app.getHttpServer();
}

function getRequiredAuditLog(auditLogs: Awaited<ReturnType<typeof findInvitationEmailAuditLogs>>) {
  const auditLog = auditLogs[0];

  if (!auditLog) {
    throw new Error("Invitation email audit log not found.");
  }

  return auditLog;
}

function createRegisteredAccount(): Promise<RegisteredTestAccount> {
  return createRegisteredAccountForInvitationTests(getHttpServer(), createdOrganizationIds);
}
