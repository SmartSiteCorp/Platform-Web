import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from "vitest";

import { configureHttpApp } from "../app-http.js";
import { AppModule } from "../app.module.js";
import { DatabaseService } from "../database/database.service.js";
import {
  createRegisteredAccountForInvitationTests,
  deleteCreatedOrganizations,
} from "../organizations/organization-invitations-test-helpers.js";
import { createOrganizationUser } from "../organizations/organization-user-management-test-helpers.js";
import type { RegisteredTestAccount } from "../organizations/organizations-test-helpers.js";
import type { ProjectUserResponseDto } from "./project-users.dto.js";
import type { SiteResponseDto } from "./sites.dto.js";
import { setUserRoles } from "./sites-test-helpers.js";

const organizations = new Set<string>();
let app: INestApplication<Server>;
let closeApp: (() => Promise<void>) | undefined;
let database: DatabaseService;
let account: RegisteredTestAccount;
let projectId: string;
let memberId: string;

beforeAll(async () => {
  process.env.AUTH_REGISTER_RATE_LIMIT_LIMIT = "1000";
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = module.createNestApplication<INestApplication<Server>>();
  closeApp = () => app.close();
  configureHttpApp(app);
  await app.init();
  database = app.get(DatabaseService);
});

beforeEach(async () => {
  account = await createRegisteredAccountForInvitationTests(app.getHttpServer(), organizations);
  const response = await request(app.getHttpServer())
    .post("/api/sites")
    .set("Authorization", auth())
    .send({ name: "Chantier intervenants" })
    .expect(201);
  projectId = (JSON.parse(response.text) as SiteResponseDto).id;
  const member = await createOrganizationUser(database, account.response.organization.id, [
    "ouvrier",
  ]);
  memberId = member.id;
});

afterEach(async () => {
  await deleteCreatedOrganizations(database, organizations);
  organizations.clear();
});

afterAll(async () => {
  await closeApp?.();
});

function auth(): string {
  return `Bearer ${account.response.accessToken}`;
}

function endpoint(id = projectId): string {
  return `/api/projects/${id}/users`;
}

function add(userId = memberId) {
  return request(app.getHttpServer())
    .post(endpoint())
    .set("Authorization", auth())
    .send({ userId });
}

function memberAuth(userId = memberId): string {
  return `Bearer ${app.get(JwtService).sign({
    sub: userId,
    organizationId: account.response.organization.id,
    email: "member@smartsite.test",
    roles: ["administrateur"],
  })}`;
}

it("associe un utilisateur, conserve ses roles et liste aussi le createur", async () => {
  const response = await add().expect(201);
  expect(JSON.parse(response.text)).toMatchObject({
    projectId,
    userId: memberId,
    roleCodes: ["ouvrier"],
  });
  const persisted = await database.query(
    "SELECT 1 FROM project_users WHERE project_id = $1 AND user_id = $2",
    [projectId, memberId],
  );
  expect(persisted.rowCount).toBe(1);
  const list = await request(app.getHttpServer())
    .get(endpoint())
    .set("Authorization", auth())
    .expect(200);
  const users = JSON.parse(list.text) as ProjectUserResponseDto[];
  expect(users).toHaveLength(2);
  expect(users.map((user) => user.userId)).toContain(account.response.user.id);
  const roles = await database.query<{ code: string }>(
    `SELECT r.code FROM site_members sm JOIN roles r ON r.id = sm.role_id
     WHERE sm.site_id = $1 AND sm.user_id = $2`,
    [projectId, memberId],
  );
  expect(roles.rows).toEqual([{ code: "ouvrier" }]);

  const audit = await database.query<{
    readonly action: string;
    readonly actor_user_id: string;
    readonly changed_fields: string[];
    readonly metadata: {
      readonly projectId: string;
      readonly roleCodes: string[];
      readonly userId: string;
    };
  }>(
    `
      SELECT action, actor_user_id, changed_fields, metadata
      FROM organization_audit_logs
      WHERE organization_id = $1 AND action = 'project.user_added'
        AND metadata->>'projectId' = $2 AND metadata->>'userId' = $3
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [account.response.organization.id, projectId, memberId],
  );
  expect(audit.rows[0]).toMatchObject({
    action: "project.user_added",
    actor_user_id: account.response.user.id,
    changed_fields: ["projectUser"],
    metadata: { projectId, roleCodes: ["ouvrier"], userId: memberId },
  });
});

it("refuse les doublons meme en concurrence", async () => {
  const responses = await Promise.all([add(), add()]);
  expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
});

it("refuse un utilisateur inexistant", async () => {
  await add(randomUUID()).expect(404);
});

it("refuse un utilisateur d'une autre organisation sans creer d'association", async () => {
  const other = await createRegisteredAccountForInvitationTests(app.getHttpServer(), organizations);
  await add(other.response.user.id).expect(403);
  const persisted = await database.query(
    "SELECT 1 FROM project_users WHERE project_id = $1 AND user_id = $2",
    [projectId, other.response.user.id],
  );
  expect(persisted.rowCount).toBe(0);
  await expect(
    database.query(
      "INSERT INTO project_users (project_id, user_id, organization_id) VALUES ($1, $2, $3)",
      [projectId, other.response.user.id, account.response.organization.id],
    ),
  ).rejects.toMatchObject({ code: "23503" });
});

it("refuse chantier inexistant ou exterieur pour les deux endpoints", async () => {
  const other = await createRegisteredAccountForInvitationTests(app.getHttpServer(), organizations);
  for (const id of [randomUUID(), projectId]) {
    const token = id === projectId ? `Bearer ${other.response.accessToken}` : auth();
    await request(app.getHttpServer()).get(endpoint(id)).set("Authorization", token).expect(404);
    await request(app.getHttpServer())
      .post(endpoint(id))
      .set("Authorization", token)
      .send({ userId: memberId })
      .expect(404);
  }
});

it("refuse acces sans JWT et identifiants invalides", async () => {
  await request(app.getHttpServer()).get(endpoint()).expect(401);
  await request(app.getHttpServer()).post(endpoint()).send({ userId: memberId }).expect(401);
  await request(app.getHttpServer())
    .get(endpoint("invalid"))
    .set("Authorization", auth())
    .expect(400);
  await request(app.getHttpServer())
    .post(endpoint("invalid"))
    .set("Authorization", auth())
    .send({ userId: memberId })
    .expect(400);
  for (const body of [
    {},
    { userId: "invalid" },
    { userId: memberId, roleCodes: ["administrateur"] },
  ]) {
    await request(app.getHttpServer())
      .post(endpoint())
      .set("Authorization", auth())
      .send(body)
      .expect(400);
  }
});

it("autorise lecture ouvrier associe mais refuse ajout malgre role JWT falsifie", async () => {
  await add().expect(201);
  await request(app.getHttpServer()).get(endpoint()).set("Authorization", memberAuth()).expect(200);
  await request(app.getHttpServer())
    .post(endpoint())
    .set("Authorization", memberAuth())
    .send({ userId: account.response.user.id })
    .expect(403);
});

it("refuse acces utilisateur non associe meme administrateur", async () => {
  await setUserRoles(database, memberId, ["administrateur"]);
  await request(app.getHttpServer()).get(endpoint()).set("Authorization", memberAuth()).expect(403);
  await request(app.getHttpServer())
    .post(endpoint())
    .set("Authorization", memberAuth())
    .send({ userId: memberId })
    .expect(403);
});

it("autorise ajout par chef associe et applique ses droits sur les phases", async () => {
  await setUserRoles(database, memberId, ["chef_chantier"]);
  await add().expect(201);
  await request(app.getHttpServer())
    .post(`/api/sites/${projectId}/phases`)
    .set("Authorization", memberAuth())
    .send({ name: "Fondations" })
    .expect(201);
  const worker = await createOrganizationUser(database, account.response.organization.id, [
    "ouvrier",
  ]);
  await request(app.getHttpServer())
    .post(endpoint())
    .set("Authorization", memberAuth())
    .send({ userId: worker.id })
    .expect(201);
});

it("refuse utilisateur inactif ou sans role", async () => {
  await setUserRoles(database, memberId, []);
  await add().expect(400);
  await setUserRoles(database, memberId, ["ouvrier"]);
  await database.query("UPDATE users SET status = 'disabled' WHERE id = $1", [memberId]);
  await add().expect(400);
});

it("revoque acces quand role courant ne correspond plus au role chantier", async () => {
  await add().expect(201);
  await setUserRoles(database, memberId, ["architecte"]);
  await request(app.getHttpServer()).get(endpoint()).set("Authorization", memberAuth()).expect(403);
  const response = await request(app.getHttpServer())
    .get(endpoint())
    .set("Authorization", auth())
    .expect(200);
  const users = JSON.parse(response.text) as ProjectUserResponseDto[];
  expect(users.find((user) => user.userId === memberId)?.roleCodes).toEqual([]);
});

it("refuse un appelant desactive", async () => {
  await database.query("UPDATE users SET status = 'disabled' WHERE id = $1", [
    account.response.user.id,
  ]);
  await add().expect(403);
  await request(app.getHttpServer()).get(endpoint()).set("Authorization", auth()).expect(403);
});
