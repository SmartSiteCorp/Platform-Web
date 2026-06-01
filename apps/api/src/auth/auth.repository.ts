import { Inject, Injectable } from "@nestjs/common";
import type { QueryResultRow } from "pg";

import { DatabaseService } from "../database/database.service.js";
import type { DatabaseExecutor } from "../database/database.types.js";
import {
  organizationAdminRoleCode,
  type AuthAccountRepository,
  type CreateOrganizationAdminInput,
  type RegisteredAccount,
  type RegisteredOrganization,
  type RegisteredUser,
} from "./auth.types.js";

interface ExistingUserRow extends QueryResultRow {
  readonly id: string;
}

interface OrganizationRow extends QueryResultRow {
  readonly id: string;
  readonly name: string;
  readonly email: string | null;
  readonly created_at: Date;
}

interface RoleRow extends QueryResultRow {
  readonly id: string;
  readonly code: string;
}

interface UserRow extends QueryResultRow {
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
export class AuthRepository implements AuthAccountRepository {
  public constructor(@Inject(DatabaseService) private readonly databaseService: DatabaseService) {}

  public async createOrganizationAdmin(
    input: CreateOrganizationAdminInput,
  ): Promise<RegisteredAccount | null> {
    return this.databaseService.withTransaction(async (transaction) => {
      await this.lockEmail(transaction, input.email);

      if (await this.emailExists(transaction, input.email)) {
        return null;
      }

      const organization = await this.createOrganization(transaction, input);
      const user = await this.createUser(transaction, input, organization.id);
      const role = await this.findRole(transaction, organizationAdminRoleCode);

      await this.assignRole(transaction, user.id, role.id);

      return {
        organization,
        user: {
          ...user,
          roles: [role.code],
        },
      };
    });
  }

  private async lockEmail(transaction: DatabaseExecutor, email: string): Promise<void> {
    await transaction.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [email]);
  }

  private async emailExists(transaction: DatabaseExecutor, email: string): Promise<boolean> {
    const result = await transaction.query<ExistingUserRow>(
      "SELECT id FROM users WHERE email = $1 LIMIT 1",
      [email],
    );

    return result.rows.length > 0;
  }

  private async createOrganization(
    transaction: DatabaseExecutor,
    input: CreateOrganizationAdminInput,
  ): Promise<RegisteredOrganization> {
    const result = await transaction.query<OrganizationRow>(
      `
        INSERT INTO organizations (name, email)
        VALUES ($1, $2)
        RETURNING id, name, email, created_at
      `,
      [input.organizationName, input.email],
    );

    const row = this.getRequiredRow(result.rows, "Organization creation failed.");

    return {
      createdAt: row.created_at.toISOString(),
      email: row.email,
      id: row.id,
      name: row.name,
    };
  }

  private async createUser(
    transaction: DatabaseExecutor,
    input: CreateOrganizationAdminInput,
    organizationId: string,
  ): Promise<Omit<RegisteredUser, "roles">> {
    const result = await transaction.query<UserRow>(
      `
        INSERT INTO users (organization_id, email, password_hash, first_name, last_name, phone)
        VALUES ($1, $2, $3, $4, $5, $6)
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

    const row = this.getRequiredRow(result.rows, "User creation failed.");

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

  private async findRole(transaction: DatabaseExecutor, code: string): Promise<RoleRow> {
    const result = await transaction.query<RoleRow>("SELECT id, code FROM roles WHERE code = $1", [
      code,
    ]);
    const role = result.rows[0];

    if (!role) {
      throw new Error(`Required role is missing: ${code}.`);
    }

    return role;
  }

  private async assignRole(
    transaction: DatabaseExecutor,
    userId: string,
    roleId: string,
  ): Promise<void> {
    await transaction.query("INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)", [
      userId,
      roleId,
    ]);
  }

  private getRequiredRow<Row>(rows: readonly Row[], message: string): Row {
    const row = rows[0];

    if (!row) {
      throw new Error(message);
    }

    return row;
  }
}
