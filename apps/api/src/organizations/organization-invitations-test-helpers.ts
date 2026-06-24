import { verify as verifyPasswordHash } from "argon2";
import { createHash, randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { QueryResultRow } from "pg";
import request, { type Response } from "supertest";

import type { DatabaseService } from "../database/database.service.js";
import type { JsonObject } from "../database/database.types.js";
import type {
  AcceptOrganizationInvitationResponseDto,
  OrganizationInvitationResponseDto,
} from "./organization-invitations.dto.js";
import { organizationInvitationEmailAuditAction } from "./organization-invitations.types.js";
import {
  createRegisterRequest,
  parseRegisterResponse,
  type RegisteredTestAccount,
} from "./organizations-test-helpers.js";

export interface CreateInvitationRequest {
  readonly email: string;
  readonly roleCodes: readonly string[];
}

export interface AcceptInvitationRequest {
  readonly token: string;
  readonly email: string;
  readonly password: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly phone?: string;
}

export interface InvitationDatabaseRow extends QueryResultRow {
  readonly email: string;
  readonly token_hash: string;
  readonly created_at: Date;
  readonly expires_at: Date;
  readonly role_codes: string[];
  readonly accepted_at: Date | null;
  readonly accepted_by: string | null;
}

export interface InvitationAuditLogDatabaseRow extends QueryResultRow {
  readonly actor_user_id: string;
  readonly action: string;
  readonly changed_fields: string[];
  readonly metadata: JsonObject;
  readonly organization_id: string;
}

export interface InvitedUserDatabaseRow extends QueryResultRow {
  readonly organization_id: string;
  readonly email: string;
  readonly password_hash: string;
  readonly role_codes: string[];
}

export async function createRegisteredAccountForInvitationTests(
  httpServer: Server,
  createdOrganizationIds: Set<string>,
): Promise<RegisteredTestAccount> {
  const registrationRequest = createRegisterRequest();
  const response = await request(httpServer)
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

export async function createInvitation(
  httpServer: Server,
  account: RegisteredTestAccount,
  invitationRequest: CreateInvitationRequest,
): Promise<OrganizationInvitationResponseDto> {
  const response = await request(httpServer)
    .post(`/api/organizations/${account.response.organization.id}/invitations`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send(invitationRequest)
    .expect(201);

  return parseInvitationResponse(response);
}

export async function acceptInvitation(
  httpServer: Server,
  invitationRequest: AcceptInvitationRequest,
): Promise<AcceptOrganizationInvitationResponseDto> {
  const response = await request(httpServer)
    .post("/api/organizations/invitations/accept")
    .send(invitationRequest)
    .expect(201);

  return parseAcceptInvitationResponse(response);
}

export async function findInvitation(
  databaseService: DatabaseService,
  invitationId: string,
): Promise<InvitationDatabaseRow> {
  const result = await databaseService.query<InvitationDatabaseRow>(
    `
      SELECT
        organization_invitations.email,
        organization_invitations.token_hash,
        organization_invitations.created_at,
        organization_invitations.expires_at,
        organization_invitations.accepted_at,
        organization_invitations.accepted_by,
        COALESCE(
          array_agg(roles.code ORDER BY roles.code)
            FILTER (WHERE roles.code IS NOT NULL),
          ARRAY[]::varchar[]
        ) AS role_codes
      FROM organization_invitations
      LEFT JOIN organization_invitation_roles
        ON organization_invitation_roles.invitation_id = organization_invitations.id
      LEFT JOIN roles ON roles.id = organization_invitation_roles.role_id
      WHERE organization_invitations.id = $1
      GROUP BY organization_invitations.id
    `,
    [invitationId],
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error(`Invitation not found: ${invitationId}.`);
  }

  return row;
}

export async function findInvitationEmailAuditLogs(
  databaseService: DatabaseService,
  invitationId: string,
): Promise<readonly InvitationAuditLogDatabaseRow[]> {
  const result = await databaseService.query<InvitationAuditLogDatabaseRow>(
    `
      SELECT organization_id, actor_user_id, action, changed_fields, metadata
      FROM organization_audit_logs
      WHERE action = $1 AND metadata->>'invitationId' = $2
      ORDER BY created_at ASC
    `,
    [organizationInvitationEmailAuditAction, invitationId],
  );

  return result.rows;
}

export async function findInvitedUser(
  databaseService: DatabaseService,
  userId: string,
): Promise<InvitedUserDatabaseRow> {
  const result = await databaseService.query<InvitedUserDatabaseRow>(
    `
      SELECT
        users.organization_id,
        users.email,
        users.password_hash,
        COALESCE(
          array_agg(roles.code ORDER BY roles.code)
            FILTER (WHERE roles.code IS NOT NULL),
          ARRAY[]::varchar[]
        ) AS role_codes
      FROM users
      LEFT JOIN user_roles ON user_roles.user_id = users.id
      LEFT JOIN roles ON roles.id = user_roles.role_id
      WHERE users.id = $1
      GROUP BY users.id
    `,
    [userId],
  );
  const row = result.rows[0];

  if (!row) {
    throw new Error(`Invited user not found: ${userId}.`);
  }

  return row;
}

export async function deleteCreatedOrganizations(
  databaseService: DatabaseService,
  createdOrganizationIds: Set<string>,
): Promise<void> {
  const organizationIds = [...createdOrganizationIds];

  if (organizationIds.length === 0) {
    return;
  }

  // Les sites cascadent vers documents, phases, tâches, preuves et problèmes.
  await databaseService.query("DELETE FROM sites WHERE organization_id = ANY($1::uuid[])", [
    organizationIds,
  ]);
  // Les fichiers référencent l'org avec RESTRICT : suppression après les documents (cascade ci-dessus).
  await databaseService.query("DELETE FROM files WHERE organization_id = ANY($1::uuid[])", [
    organizationIds,
  ]);
  await databaseService.query("DELETE FROM users WHERE organization_id = ANY($1::uuid[])", [
    organizationIds,
  ]);
  await databaseService.query("DELETE FROM organizations WHERE id = ANY($1::uuid[])", [
    organizationIds,
  ]);
}

export async function removeUserRoles(
  databaseService: DatabaseService,
  userId: string,
): Promise<void> {
  await databaseService.query("DELETE FROM user_roles WHERE user_id = $1", [userId]);
}

export async function expireInvitation(
  databaseService: DatabaseService,
  invitationId: string,
): Promise<void> {
  await databaseService.query(
    `
      UPDATE organization_invitations
      SET expires_at = now() - interval '1 hour'
      WHERE id = $1
    `,
    [invitationId],
  );
}

export function createInvitationEmail(): string {
  return `invitation-${randomUUID()}@smartsite.test`;
}

export function createAcceptInvitationRequest(
  token: string,
  email: string,
): AcceptInvitationRequest {
  return {
    email,
    firstName: "Alex",
    lastName: "Fraioli",
    password: "SmartSite.2026",
    token,
  };
}

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyInvitedPasswordHash(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  return verifyPasswordHash(passwordHash, password);
}

function parseInvitationResponse(response: Response): OrganizationInvitationResponseDto {
  return JSON.parse(response.text) as OrganizationInvitationResponseDto;
}

function parseAcceptInvitationResponse(
  response: Response,
): AcceptOrganizationInvitationResponseDto {
  return JSON.parse(response.text) as AcceptOrganizationInvitationResponseDto;
}
