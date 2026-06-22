import { Inject, Injectable } from "@nestjs/common";
import type { QueryResultRow } from "pg";

import { DatabaseService } from "../database/database.service.js";
import type { DatabaseExecutor, JsonObject } from "../database/database.types.js";
import type {
  OrganizationAuditLogInput,
  OrganizationDetails,
  OrganizationsRepositoryPort,
  OrganizationUserAccess,
  UpdateOrganizationInput,
} from "./organizations.types.js";
import { organizationUpdatedAuditAction } from "./organizations.types.js";

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
    actorUserId: string,
  ): Promise<OrganizationDetails | null> {
    return this.databaseService.withTransaction(async (transaction) => {
      const currentOrganization = await this.findByIdForUpdate(transaction, organizationId);

      if (!currentOrganization) {
        return null;
      }

      const organization = await this.updateByIdWithExecutor(transaction, organizationId, input);
      const changedFields = this.getChangedFields(currentOrganization, input);

      await this.createAuditLog(transaction, {
        action: organizationUpdatedAuditAction,
        actorUserId,
        changedFields,
        organizationId,
      });

      return organization;
    });
  }

  private async findByIdForUpdate(
    transaction: DatabaseExecutor,
    organizationId: string,
  ): Promise<OrganizationDetails | null> {
    const result = await transaction.query<OrganizationRow>(
      `
        SELECT id, name, email, phone, address, created_at, updated_at
        FROM organizations
        WHERE id = $1
        FOR UPDATE
      `,
      [organizationId],
    );
    const row = result.rows[0];

    return row ? this.mapOrganization(row) : null;
  }

  private async updateByIdWithExecutor(
    transaction: DatabaseExecutor,
    organizationId: string,
    input: UpdateOrganizationInput,
  ): Promise<OrganizationDetails> {
    const result = await transaction.query<OrganizationRow>(
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
    const row = this.getRequiredRow(result.rows, "Organization update failed.");

    return this.mapOrganization(row);
  }

  private async createAuditLog(
    transaction: DatabaseExecutor,
    input: OrganizationAuditLogInput,
  ): Promise<void> {
    const metadata: JsonObject = {
      changedFields: [...input.changedFields],
    };

    // L'audit garde uniquement les champs modifiés, jamais les valeurs sensibles.
    await transaction.query(
      `
        INSERT INTO organization_audit_logs
          (organization_id, actor_user_id, action, changed_fields, metadata)
        VALUES ($1, $2, $3, $4, $5::jsonb)
      `,
      [
        input.organizationId,
        input.actorUserId,
        input.action,
        [...input.changedFields],
        JSON.stringify(metadata),
      ],
    );
  }

  private getChangedFields(
    currentOrganization: OrganizationDetails,
    input: UpdateOrganizationInput,
  ): string[] {
    const changedFields: string[] = [];

    if (currentOrganization.name !== input.name) {
      changedFields.push("name");
    }

    if (currentOrganization.email !== input.email) {
      changedFields.push("email");
    }

    if (currentOrganization.phone !== input.phone) {
      changedFields.push("phone");
    }

    if (currentOrganization.address !== input.address) {
      changedFields.push("address");
    }

    return changedFields;
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

  private getRequiredRow<Row>(rows: readonly Row[], message: string): Row {
    const row = rows[0];

    if (!row) {
      throw new Error(message);
    }

    return row;
  }
}
