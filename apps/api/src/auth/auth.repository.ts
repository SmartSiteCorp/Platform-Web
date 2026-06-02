import { Inject, Injectable } from "@nestjs/common";
import type { QueryResultRow } from "pg";

import { DatabaseService } from "../database/database.service.js";
import type { DatabaseExecutor } from "../database/database.types.js";
import {
  organizationAdminRoleCode,
  type AuthAccountRepository,
  type CreateOrganizationAdminInput,
  type LoginAccount,
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

interface LoginAccountRow extends QueryResultRow {
  readonly organization_created_at: Date;
  readonly organization_email: string | null;
  readonly organization_id: string;
  readonly organization_name: string;
  readonly password_hash: string;
  readonly role_codes: string[];
  readonly user_created_at: Date;
  readonly user_email: string;
  readonly user_first_name: string;
  readonly user_id: string;
  readonly user_last_name: string;
  readonly user_organization_id: string;
  readonly user_phone: string | null;
  readonly user_status: string;
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

  public async findAccountByEmail(email: string): Promise<LoginAccount | null> {
    const result = await this.databaseService.query<LoginAccountRow>(
      `
        SELECT
          users.id AS user_id,
          users.organization_id AS user_organization_id,
          users.email AS user_email,
          users.password_hash,
          users.first_name AS user_first_name,
          users.last_name AS user_last_name,
          users.phone AS user_phone,
          users.status AS user_status,
          users.created_at AS user_created_at,
          organizations.id AS organization_id,
          organizations.name AS organization_name,
          organizations.email AS organization_email,
          organizations.created_at AS organization_created_at,
          COALESCE(
            array_agg(roles.code ORDER BY roles.code) FILTER (WHERE roles.code IS NOT NULL),
            ARRAY[]::varchar[]
          ) AS role_codes
        FROM users
        INNER JOIN organizations ON organizations.id = users.organization_id
        LEFT JOIN user_roles ON user_roles.user_id = users.id
        LEFT JOIN roles ON roles.id = user_roles.role_id
        WHERE users.email = $1
        GROUP BY users.id, organizations.id
      `,
      [email],
    );
    const row = result.rows[0];

    return row ? this.mapLoginAccount(row) : null;
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

  private mapLoginAccount(row: LoginAccountRow): LoginAccount {
    return {
      organization: {
        createdAt: row.organization_created_at.toISOString(),
        email: row.organization_email,
        id: row.organization_id,
        name: row.organization_name,
      },
      passwordHash: row.password_hash,
      user: {
        createdAt: row.user_created_at.toISOString(),
        email: row.user_email,
        firstName: row.user_first_name,
        id: row.user_id,
        lastName: row.user_last_name,
        organizationId: row.user_organization_id,
        phone: row.user_phone,
        roles: row.role_codes,
        status: row.user_status,
      },
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
