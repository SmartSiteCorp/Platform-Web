import { Inject, Injectable } from "@nestjs/common";
import type { QueryResultRow } from "pg";

import { DatabaseService } from "../database/database.service.js";
import type { DatabaseExecutor } from "../database/database.types.js";
import type {
  CreateOrganizationInvitationInput,
  CreateOrganizationInvitationResult,
  OrganizationInvitationDetails,
  OrganizationInvitationRepositoryPort,
  OrganizationInvitationRole,
} from "./organization-invitations.types.js";

interface IdRow extends QueryResultRow {
  readonly id: string;
}

interface RoleRow extends QueryResultRow {
  readonly id: string;
  readonly code: string;
}

interface InvitationRow extends QueryResultRow {
  readonly id: string;
  readonly organization_id: string;
  readonly email: string;
  readonly expires_at: Date;
  readonly created_at: Date;
}

@Injectable()
export class OrganizationInvitationsRepository implements OrganizationInvitationRepositoryPort {
  public constructor(@Inject(DatabaseService) private readonly databaseService: DatabaseService) {}

  public async createInvitation(
    input: CreateOrganizationInvitationInput,
  ): Promise<CreateOrganizationInvitationResult> {
    return this.databaseService.withTransaction(async (transaction) => {
      if (await this.isEmailAlreadyMember(transaction, input.organizationId, input.email)) {
        return { status: "emailAlreadyMember" };
      }

      if (await this.hasActiveInvitation(transaction, input.organizationId, input.email)) {
        return { status: "activeInvitationExists" };
      }

      const roles = await this.findRolesByCodes(transaction, input.roleCodes);
      const missingRoleCodes = this.getMissingRoleCodes(input.roleCodes, roles);

      if (missingRoleCodes.length > 0) {
        return { missingRoleCodes, status: "invalidRoles" };
      }

      const invitation = await this.insertInvitation(transaction, input);

      await this.insertInvitationRoles(transaction, invitation.id, roles);

      return {
        invitation: {
          ...invitation,
          roleCodes: roles.map((role) => role.code),
        },
        status: "created",
      };
    });
  }

  private async isEmailAlreadyMember(
    transaction: DatabaseExecutor,
    organizationId: string,
    email: string,
  ): Promise<boolean> {
    const result = await transaction.query<IdRow>(
      `
        SELECT id
        FROM users
        WHERE organization_id = $1 AND lower(email) = lower($2)
        LIMIT 1
      `,
      [organizationId, email],
    );

    return Boolean(result.rows[0]);
  }

  private async hasActiveInvitation(
    transaction: DatabaseExecutor,
    organizationId: string,
    email: string,
  ): Promise<boolean> {
    const result = await transaction.query<IdRow>(
      `
        SELECT id
        FROM organization_invitations
        WHERE organization_id = $1
          AND lower(email) = lower($2)
          AND accepted_at IS NULL
          AND revoked_at IS NULL
          AND expires_at > now()
        LIMIT 1
      `,
      [organizationId, email],
    );

    return Boolean(result.rows[0]);
  }

  private async findRolesByCodes(
    transaction: DatabaseExecutor,
    roleCodes: readonly string[],
  ): Promise<readonly OrganizationInvitationRole[]> {
    const result = await transaction.query<RoleRow>(
      `
        SELECT id, code
        FROM roles
        WHERE code = ANY($1::varchar[])
        ORDER BY code
      `,
      [[...roleCodes]],
    );

    return result.rows.map((row) => ({
      code: row.code,
      id: row.id,
    }));
  }

  private async insertInvitation(
    transaction: DatabaseExecutor,
    input: CreateOrganizationInvitationInput,
  ): Promise<Omit<OrganizationInvitationDetails, "roleCodes">> {
    const result = await transaction.query<InvitationRow>(
      `
        INSERT INTO organization_invitations
          (organization_id, email, token_hash, invited_by, expires_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, organization_id, email, expires_at, created_at
      `,
      [input.organizationId, input.email, input.tokenHash, input.invitedBy, input.expiresAt],
    );
    const row = this.getRequiredRow(result.rows, "Organization invitation creation failed.");

    return {
      createdAt: row.created_at.toISOString(),
      email: row.email,
      expiresAt: row.expires_at.toISOString(),
      id: row.id,
      organizationId: row.organization_id,
    };
  }

  private async insertInvitationRoles(
    transaction: DatabaseExecutor,
    invitationId: string,
    roles: readonly OrganizationInvitationRole[],
  ): Promise<void> {
    await transaction.query(
      `
        INSERT INTO organization_invitation_roles (invitation_id, role_id)
        SELECT $1, unnest($2::uuid[])
      `,
      [invitationId, roles.map((role) => role.id)],
    );
  }

  private getMissingRoleCodes(
    expectedRoleCodes: readonly string[],
    roles: readonly OrganizationInvitationRole[],
  ): readonly string[] {
    const existingRoleCodes = new Set(roles.map((role) => role.code));

    return expectedRoleCodes.filter((roleCode) => !existingRoleCodes.has(roleCode));
  }

  private getRequiredRow<Row>(rows: readonly Row[], message: string): Row {
    const row = rows[0];

    if (!row) {
      throw new Error(message);
    }

    return row;
  }
}
