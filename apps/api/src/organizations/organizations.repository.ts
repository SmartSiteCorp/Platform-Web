import { Inject, Injectable } from "@nestjs/common";
import type { QueryResultRow } from "pg";

import { DatabaseService } from "../database/database.service.js";
import type {
  OrganizationDetails,
  OrganizationsRepositoryPort,
  OrganizationUserAccess,
  UpdateOrganizationInput,
} from "./organizations.types.js";

interface OrganizationRow extends QueryResultRow {
  readonly id: string;
  readonly name: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly address: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}

interface UserAccessRow extends QueryResultRow {
  readonly status: string;
  readonly role_codes: string[];
}

@Injectable()
export class OrganizationsRepository implements OrganizationsRepositoryPort {
  public constructor(@Inject(DatabaseService) private readonly databaseService: DatabaseService) {}

  public async findById(organizationId: string): Promise<OrganizationDetails | null> {
    const result = await this.databaseService.query<OrganizationRow>(
      `
        SELECT id, name, email, phone, address, created_at, updated_at
        FROM organizations
        WHERE id = $1
      `,
      [organizationId],
    );
    const row = result.rows[0];

    return row ? this.mapOrganization(row) : null;
  }

  public async findUserAccess(
    userId: string,
    organizationId: string,
  ): Promise<OrganizationUserAccess | null> {
    // L'accès est relu en base pour ne pas faire confiance au JWT seul.
    const result = await this.databaseService.query<UserAccessRow>(
      `
        SELECT
          users.status,
          COALESCE(array_agg(roles.code) FILTER (WHERE roles.code IS NOT NULL), ARRAY[]::varchar[])
            AS role_codes
        FROM users
        LEFT JOIN user_roles ON user_roles.user_id = users.id
        LEFT JOIN roles ON roles.id = user_roles.role_id
        WHERE users.id = $1 AND users.organization_id = $2
        GROUP BY users.id
      `,
      [userId, organizationId],
    );
    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return {
      roleCodes: row.role_codes,
      status: row.status,
    };
  }

  public async updateById(
    organizationId: string,
    input: UpdateOrganizationInput,
  ): Promise<OrganizationDetails | null> {
    const result = await this.databaseService.query<OrganizationRow>(
      `
        UPDATE organizations
        SET
          name = $2,
          email = $3,
          phone = $4,
          address = $5,
          updated_at = now()
        WHERE id = $1
        RETURNING id, name, email, phone, address, created_at, updated_at
      `,
      [organizationId, input.name, input.email, input.phone, input.address],
    );
    const row = result.rows[0];

    return row ? this.mapOrganization(row) : null;
  }

  private mapOrganization(row: OrganizationRow): OrganizationDetails {
    return {
      address: row.address,
      createdAt: row.created_at.toISOString(),
      email: row.email,
      id: row.id,
      name: row.name,
      phone: row.phone,
      updatedAt: row.updated_at.toISOString(),
    };
  }
}
