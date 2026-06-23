import { Inject, Injectable } from "@nestjs/common";
import type { QueryResultRow } from "pg";
import { isOrganizationRoleCode, type OrganizationRoleCode } from "@smartsite/shared";

import { DatabaseService } from "../database/database.service.js";
import type { DatabaseExecutor } from "../database/database.types.js";
import type {
  OrganizationUserRoles,
  OrganizationUserRolesRepositoryPort,
  ReplaceOrganizationUserRolesInput,
} from "./organization-user-roles.types.js";

interface UserRow extends QueryResultRow {
  readonly id: string;
  readonly organization_id: string;
}

interface UserRolesRow extends UserRow {
  readonly role_codes: string[];
}

interface RoleRow extends QueryResultRow {
  readonly id: string;
  readonly code: string;
}

@Injectable()
export class OrganizationUserRolesRepository implements OrganizationUserRolesRepositoryPort {
  public constructor(@Inject(DatabaseService) private readonly databaseService: DatabaseService) {}

  public async findUserRoles(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationUserRoles | null> {
    return this.findUserRolesWithExecutor(this.databaseService, organizationId, userId);
  }

  public async replaceUserRoles(
    input: ReplaceOrganizationUserRolesInput,
  ): Promise<OrganizationUserRoles | null> {
    return this.databaseService.withTransaction(async (transaction) => {
      const user = await this.findUserForUpdate(transaction, input.organizationId, input.userId);

      if (!user) {
        return null;
      }

      const roles = await this.findRolesByCodes(transaction, input.roleCodes);

      this.assertAllRolesExist(input.roleCodes, roles);

      await this.deleteUserRoles(transaction, input.userId);
      await this.insertUserRoles(transaction, input.userId, roles);

      return this.findUserRolesWithExecutor(transaction, input.organizationId, input.userId);
    });
  }

  private async findUserRolesWithExecutor(
    executor: DatabaseExecutor,
    organizationId: string,
    userId: string,
  ): Promise<OrganizationUserRoles | null> {
    const result = await executor.query<UserRolesRow>(
      `
        SELECT
          users.id,
          users.organization_id,
          COALESCE(array_agg(roles.code ORDER BY roles.code)
            FILTER (WHERE roles.code IS NOT NULL), ARRAY[]::varchar[]) AS role_codes
        FROM users
        LEFT JOIN user_roles ON user_roles.user_id = users.id
        LEFT JOIN roles ON roles.id = user_roles.role_id
        WHERE users.id = $1 AND users.organization_id = $2
        GROUP BY users.id
      `,
      [userId, organizationId],
    );
    const row = result.rows[0];

    return row ? this.mapUserRoles(row) : null;
  }

  private async findUserForUpdate(
    transaction: DatabaseExecutor,
    organizationId: string,
    userId: string,
  ): Promise<UserRow | null> {
    const result = await transaction.query<UserRow>(
      `
        SELECT id, organization_id
        FROM users
        WHERE id = $1 AND organization_id = $2
        FOR UPDATE
      `,
      [userId, organizationId],
    );

    return result.rows[0] ?? null;
  }

  private async findRolesByCodes(
    transaction: DatabaseExecutor,
    roleCodes: readonly OrganizationRoleCode[],
  ): Promise<readonly RoleRow[]> {
    const result = await transaction.query<RoleRow>(
      `
        SELECT id, code
        FROM roles
        WHERE code = ANY($1::varchar[])
        ORDER BY code
      `,
      [[...roleCodes]],
    );

    return result.rows;
  }

  private async deleteUserRoles(transaction: DatabaseExecutor, userId: string): Promise<void> {
    await transaction.query(
      `
        DELETE FROM user_roles
        WHERE user_id = $1
      `,
      [userId],
    );
  }

  private async insertUserRoles(
    transaction: DatabaseExecutor,
    userId: string,
    roles: readonly RoleRow[],
  ): Promise<void> {
    if (roles.length === 0) {
      return;
    }

    await transaction.query(
      `
        INSERT INTO user_roles (user_id, role_id)
        SELECT $1, unnest($2::uuid[])
      `,
      [userId, roles.map((role) => role.id)],
    );
  }

  private assertAllRolesExist(
    expectedRoleCodes: readonly OrganizationRoleCode[],
    roles: readonly RoleRow[],
  ): void {
    const existingRoleCodes = new Set(roles.map((role) => role.code));
    const missingRoleCode = expectedRoleCodes.find((roleCode) => !existingRoleCodes.has(roleCode));

    if (missingRoleCode) {
      throw new Error(`Role seed is missing: ${missingRoleCode}.`);
    }
  }

  private mapUserRoles(row: UserRolesRow): OrganizationUserRoles {
    return {
      organizationId: row.organization_id,
      roleCodes: this.mapRoleCodes(row.role_codes),
      userId: row.id,
    };
  }

  private mapRoleCodes(roleCodes: readonly string[]): OrganizationRoleCode[] {
    const organizationRoleCodes: OrganizationRoleCode[] = [];

    for (const roleCode of roleCodes) {
      if (!isOrganizationRoleCode(roleCode)) {
        throw new Error(`Unknown organization role code from database: ${roleCode}.`);
      }

      organizationRoleCodes.push(roleCode);
    }

    return organizationRoleCodes;
  }
}
