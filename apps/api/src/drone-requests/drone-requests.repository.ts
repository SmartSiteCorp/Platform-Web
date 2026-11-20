import { Inject, Injectable } from "@nestjs/common";
import type { QueryResultRow } from "pg";

import { DatabaseService } from "../database/database.service.js";
import type { DatabaseExecutor } from "../database/database.types.js";
import { droneRequestCreatedAuditAction } from "./drone-requests.types.js";
import type {
  CreateDroneRequestInput,
  DroneRequestDetails,
  DroneRequestsRepositoryPort,
} from "./drone-requests.types.js";

interface DroneRequestRow extends QueryResultRow {
  readonly id: string;
  readonly site_id: string;
  readonly mission_description: string | null;
  readonly requested_date: string | null;
  readonly status: string;
  readonly created_at: Date;
  readonly updated_at: Date;
}

@Injectable()
export class DroneRequestsRepository implements DroneRequestsRepositoryPort {
  public constructor(@Inject(DatabaseService) private readonly databaseService: DatabaseService) {}

  public async siteExistsInOrganization(siteId: string, organizationId: string): Promise<boolean> {
    const result = await this.databaseService.query<{ readonly id: string }>(
      `SELECT id FROM sites WHERE id = $1 AND organization_id = $2`,
      [siteId, organizationId],
    );

    return result.rows.length > 0;
  }

  public async userCanManageSiteDroneRequests(
    siteId: string,
    userId: string,
    roleCodes: readonly string[],
  ): Promise<boolean> {
    const result = await this.databaseService.query<{ readonly site_id: string }>(
      `
        SELECT site_members.site_id
        FROM site_members
        INNER JOIN roles ON roles.id = site_members.role_id
        WHERE site_members.site_id = $1
          AND site_members.user_id = $2
          AND roles.code = ANY($3::varchar[])
        LIMIT 1
      `,
      [siteId, userId, [...roleCodes]],
    );

    return result.rows.length > 0;
  }

  public async createDroneRequest(input: CreateDroneRequestInput): Promise<DroneRequestDetails> {
    return this.databaseService.withTransaction(async (transaction) => {
      const result = await transaction.query<DroneRequestRow>(
        `
          INSERT INTO drone_requests
            (site_id, organization_id, requested_by, mission_description, requested_date)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING
            id, site_id, mission_description,
            requested_date::text AS requested_date,
            status, created_at, updated_at
        `,
        [
          input.siteId,
          input.organizationId,
          input.requestedBy,
          input.missionDescription,
          input.requestedDate,
        ],
      );

      const droneRequest = result.rows[0];

      if (!droneRequest) {
        throw new Error("La demande de droniste n'a pas pu être créée.");
      }

      await this.insertDroneRequestAuditLog(transaction, input, droneRequest);

      return this.mapDroneRequest(droneRequest);
    });
  }

  public async listDroneRequestsBySite(siteId: string): Promise<readonly DroneRequestDetails[]> {
    const result = await this.databaseService.query<DroneRequestRow>(
      `
        SELECT
          id, site_id, mission_description,
          requested_date::text AS requested_date,
          status, created_at, updated_at
        FROM drone_requests
        WHERE site_id = $1
        ORDER BY created_at DESC
      `,
      [siteId],
    );

    return result.rows.map((row) => this.mapDroneRequest(row));
  }

  private async insertDroneRequestAuditLog(
    transaction: DatabaseExecutor,
    input: CreateDroneRequestInput,
    droneRequest: DroneRequestRow,
  ): Promise<void> {
    await transaction.query(
      `
        INSERT INTO organization_audit_logs (organization_id, actor_user_id, action, metadata)
        VALUES ($1, $2, $3, $4::jsonb)
      `,
      [
        input.organizationId,
        input.requestedBy,
        droneRequestCreatedAuditAction,
        JSON.stringify({ droneRequestId: droneRequest.id, siteId: input.siteId }),
      ],
    );
  }

  private mapDroneRequest(row: DroneRequestRow): DroneRequestDetails {
    return {
      createdAt: row.created_at.toISOString(),
      id: row.id,
      missionDescription: row.mission_description,
      requestedDate: row.requested_date,
      siteId: row.site_id,
      status: row.status as DroneRequestDetails["status"],
      updatedAt: row.updated_at.toISOString(),
    };
  }
}
