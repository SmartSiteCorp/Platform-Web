import { Inject, Injectable } from "@nestjs/common";
import type { QueryResultRow } from "pg";

import type { RegisteredUser } from "../auth/auth.types.js";
import { DatabaseService } from "../database/database.service.js";
import type { DatabaseExecutor } from "../database/database.types.js";
import type {
  AcceptOrganizationInvitationInput,
  AcceptOrganizationInvitationResult,
  OrganizationInvitationAcceptanceRepositoryPort,
  OrganizationInvitationRole,
  StoredOrganizationInvitation,
} from "./organization-invitations.types.js";

interface IdRow extends QueryResultRow {
  readonly id: string;
}

interface RoleRow extends QueryResultRow {
  readonly id: string;
  readonly code: string;
}

interface StoredInvitationRow extends QueryResultRow {
  readonly id: string;
  readonly organization_id: string;
  readonly email: string;
  readonly expires_at: Date;
  readonly accepted_at: Date | null;
  readonly revoked_at: Date | null;
  readonly organization_name: string;
  readonly organization_email: string | null;
  readonly organization_created_at: Date;
}

interface CreatedUserRow extends QueryResultRow {
  readonly id: string;
  readonly organization_id: string;
  readonly email: string;
  readonly first_name: string;
  readonly last_name: string;
  readonly phone: string | null;
  readonly status: string;
  readonly created_at: Date;
}

@Injectable()
export class OrganizationInvitationAcceptanceRepository implements OrganizationInvitationAcceptanceRepositoryPort {
  public constructor(@Inject(DatabaseService) private readonly databaseService: DatabaseService) {}

  public async acceptInvitation(
    input: AcceptOrganizationInvitationInput,
  ): Promise<AcceptOrganizationInvitationResult> {
    return this.databaseService.withTransaction(async (transaction) => {
      const invitation = await this.findInvitationByTokenHashForUpdate(
        transaction,
        input.tokenHash,
      );

      if (!invitation || invitation.revokedAt) {
        return { status: "invalid" };
      }

      if (invitation.acceptedAt) {
        return { status: "alreadyAccepted" };
      }

      if (invitation.expiresAt.getTime() <= Date.now()) {
        return { status: "expired" };
      }

      if (invitation.email !== input.email) {
        return { status: "emailMismatch" };
      }

      if (await this.isEmailAlreadyUsed(transaction, input.email)) {
        return { status: "emailAlreadyUsed" };
      }

      const invitationRoles = await this.findInvitationRoles(transaction, invitation.id);
      const user = await this.insertInvitedUser(transaction, invitation.organizationId, input);

      await this.assignInvitationRoles(transaction, user.id, invitation.id);
      await this.markInvitationAccepted(transaction, invitation.id, user.id);

      return {
        account: {
          organization: invitation.organization,
          user: {
            ...user,
            roles: invitationRoles.map((role) => role.code),
          },
        },
        status: "accepted",
      };
    });
  }

  private async findInvitationByTokenHashForUpdate(
    transaction: DatabaseExecutor,
    tokenHash: string,
  ): Promise<StoredOrganizationInvitation | null> {
    const result = await transaction.query<StoredInvitationRow>(
      `
        SELECT
          organization_invitations.id,
          organization_invitations.organization_id,
          organization_invitations.email,
          organization_invitations.expires_at,
          organization_invitations.accepted_at,
          organization_invitations.revoked_at,
          organizations.name AS organization_name,
          organizations.email AS organization_email,
          organizations.created_at AS organization_created_at
        FROM organization_invitations
        INNER JOIN organizations ON organizations.id = organization_invitations.organization_id
        WHERE organization_invitations.token_hash = $1
        FOR UPDATE OF organization_invitations
      `,
      [tokenHash],
    );
    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return {
      acceptedAt: row.accepted_at,
      email: row.email,
      expiresAt: row.expires_at,
      id: row.id,
      organization: {
        createdAt: row.organization_created_at.toISOString(),
        email: row.organization_email,
        id: row.organization_id,
        name: row.organization_name,
      },
      organizationId: row.organization_id,
      revokedAt: row.revoked_at,
    };
  }

  private async findInvitationRoles(
    transaction: DatabaseExecutor,
    invitationId: string,
  ): Promise<readonly OrganizationInvitationRole[]> {
    const result = await transaction.query<RoleRow>(
      `
        SELECT roles.id, roles.code
        FROM organization_invitation_roles
        INNER JOIN roles ON roles.id = organization_invitation_roles.role_id
        WHERE organization_invitation_roles.invitation_id = $1
        ORDER BY roles.code
      `,
      [invitationId],
    );

    return result.rows.map((row) => ({
      code: row.code,
      id: row.id,
    }));
  }

  private async isEmailAlreadyUsed(transaction: DatabaseExecutor, email: string): Promise<boolean> {
    const result = await transaction.query<IdRow>(
      `
        SELECT id
        FROM users
        WHERE lower(email) = lower($1)
        LIMIT 1
      `,
      [email],
    );

    return Boolean(result.rows[0]);
  }

  private async insertInvitedUser(
    transaction: DatabaseExecutor,
    organizationId: string,
    input: AcceptOrganizationInvitationInput,
  ): Promise<Omit<RegisteredUser, "roles">> {
    const result = await transaction.query<CreatedUserRow>(
      `
        INSERT INTO users
          (organization_id, email, password_hash, first_name, last_name, phone, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'active')
        RETURNING id, organization_id, email, first_name, last_name, phone, status, created_at
      `,
      [
        organizationId,
        input.email,
        input.passwordHash,
        input.firstName,
        input.lastName,
        input.phone,
      ],
    );
    const row = this.getRequiredRow(result.rows, "Invited user creation failed.");

    return {
      createdAt: row.created_at.toISOString(),
      email: row.email,
      firstName: row.first_name,
      id: row.id,
      lastName: row.last_name,
      organizationId: row.organization_id,
      phone: row.phone,
      status: row.status,
    };
  }

  private async assignInvitationRoles(
    transaction: DatabaseExecutor,
    userId: string,
    invitationId: string,
  ): Promise<void> {
    await transaction.query(
      `
        INSERT INTO user_roles (user_id, role_id)
        SELECT $1, role_id
        FROM organization_invitation_roles
        WHERE invitation_id = $2
        ON CONFLICT DO NOTHING
      `,
      [userId, invitationId],
    );
  }

  private async markInvitationAccepted(
    transaction: DatabaseExecutor,
    invitationId: string,
    userId: string,
  ): Promise<void> {
    await transaction.query(
      `
        UPDATE organization_invitations
        SET accepted_by = $2, accepted_at = now()
        WHERE id = $1
      `,
      [invitationId, userId],
    );
  }

  private getRequiredRow<Row>(rows: readonly Row[], message: string): Row {
    const row = rows[0];

    if (!row) {
      throw new Error(message);
    }

    return row;
  }
}
