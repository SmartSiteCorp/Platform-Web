import { randomUUID } from "node:crypto";
import type { QueryResultRow } from "pg";
import type { OrganizationRoleCode } from "@smartsite/shared";

import { DatabaseService } from "../database/database.service.js";

export interface CreatedOrganizationUser {
  readonly id: string;
}

interface CreatedUserRow extends QueryResultRow {
  readonly id: string;
}

interface UserRoleDatabaseRow extends QueryResultRow {
  readonly role_codes: string[];
}

export async function createOrganizationUser(
  databaseService: DatabaseService,
  organizationId: string,
  roleCodes: readonly OrganizationRoleCode[],
): Promise<CreatedOrganizationUser> {
  const result = await databaseService.query<CreatedUserRow>(
    `
      INSERT INTO users (organization_id, email, password_hash, first_name, last_name, status)
      VALUES ($1, $2, $3, $4, $5, 'active')
      RETURNING id
    `,
    [
      organizationId,
      `organization-user-${randomUUID()}@smartsite.test`,
      "test-password-hash",
      "Armand",
      "Braud",
    ],
  );
  const user = result.rows[0];

  if (!user) {
    throw new Error("Test user was not created.");
  }

  await databaseService.query(
    `
      INSERT INTO user_roles (user_id, role_id)
      SELECT $1, roles.id
      FROM roles
      WHERE roles.code = ANY($2::varchar[])
    `,
    [user.id, [...roleCodes]],
  );

  return {
    id: user.id,
  };
}

export async function findPersistedRoleCodes(
  databaseService: DatabaseService,
  userId: string,
): Promise<readonly string[]> {
  const result = await databaseService.query<UserRoleDatabaseRow>(
    `
      SELECT COALESCE(array_agg(roles.code ORDER BY roles.code)
        FILTER (WHERE roles.code IS NOT NULL), ARRAY[]::varchar[]) AS role_codes
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
    throw new Error(`User roles not found for ${userId}.`);
  }

  return row.role_codes;
}
