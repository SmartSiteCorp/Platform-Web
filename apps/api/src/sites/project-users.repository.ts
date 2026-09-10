import { Inject, Injectable } from "@nestjs/common";

import { DatabaseService } from "../database/database.service.js";
import type { DatabaseExecutor } from "../database/database.types.js";
import type { ProjectUserResponseDto } from "./project-users.dto.js";

@Injectable()
export class ProjectUsersRepository {
  public constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  public async siteExists(projectId: string, organizationId: string): Promise<boolean> {
    const result = await this.database.query(
      "SELECT id FROM sites WHERE id = $1 AND organization_id = $2",
      [projectId, organizationId],
    );
    return result.rows.length > 0;
  }

  public async canAccess(
    projectId: string,
    userId: string,
    roleCodes: readonly string[],
  ): Promise<boolean> {
    const result = await this.database.query(
      `
        SELECT 1 FROM site_members sm
        JOIN user_roles ur ON ur.user_id = sm.user_id AND ur.role_id = sm.role_id
        JOIN roles r ON r.id = sm.role_id
        WHERE sm.site_id = $1 AND sm.user_id = $2 AND r.code = ANY($3::varchar[])
        LIMIT 1
      `,
      [projectId, userId, [...roleCodes]],
    );
    return result.rows.length > 0;
  }

  public async add(
    projectId: string,
    userId: string,
    organizationId: string,
    actorUserId: string,
  ): Promise<
    ProjectUserResponseDto | "missing" | "foreign" | "inactive" | "no_roles" | "duplicate"
  > {
    return this.database.withTransaction(async (transaction) => {
      const result = await transaction.query<{ organization_id: string; status: string }>(
        "SELECT organization_id, status FROM users WHERE id = $1 FOR UPDATE",
        [userId],
      );
      const user = result.rows[0];
      if (!user) return "missing";
      if (user.organization_id !== organizationId) return "foreign";
      if (user.status !== "active") return "inactive";

      const roles = await transaction.query<{ role_id: string; role_code: string }>(
        `
          SELECT user_roles.role_id, roles.code AS role_code
          FROM user_roles
          INNER JOIN roles ON roles.id = user_roles.role_id
          WHERE user_roles.user_id = $1
        `,
        [userId],
      );
      if (roles.rows.length === 0) return "no_roles";

      const association = await transaction.query(
        `
          INSERT INTO project_users (project_id, user_id, organization_id)
          VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING user_id
        `,
        [projectId, userId, organizationId],
      );
      if (association.rows.length === 0) return "duplicate";

      await transaction.query(
        `
          INSERT INTO site_members (site_id, user_id, role_id)
          SELECT $1, $2, unnest($3::uuid[]) ON CONFLICT DO NOTHING
        `,
        [projectId, userId, roles.rows.map((role) => role.role_id)],
      );
      await transaction.query(
        `
          INSERT INTO organization_audit_logs
            (organization_id, actor_user_id, action, changed_fields, metadata)
          VALUES ($1, $2, $3, $4, $5::jsonb)
        `,
        [
          organizationId,
          actorUserId,
          "project.user_added",
          ["projectUser"],
          JSON.stringify({
            projectId,
            roleCodes: roles.rows.map((role) => role.role_code),
            userId,
          }),
        ],
      );
      const members = await this.findUsers(transaction, projectId, userId);
      const member = members[0];
      if (!member) throw new Error("L'association au chantier n'a pas pu être créée.");
      return member;
    });
  }

  public list(projectId: string): Promise<ProjectUserResponseDto[]> {
    return this.findUsers(this.database, projectId);
  }

  private async findUsers(
    executor: DatabaseExecutor,
    projectId: string,
    userId: string | null = null,
  ): Promise<ProjectUserResponseDto[]> {
    const result = await executor.query<ProjectUserResponseDto>(
      `
        SELECT pu.project_id AS "projectId", u.id AS "userId",
          u.first_name AS "firstName", u.last_name AS "lastName",
          COALESCE(array_agg(DISTINCT r.code ORDER BY r.code)
            FILTER (WHERE r.code IS NOT NULL), ARRAY[]::varchar[]) AS "roleCodes"
        FROM project_users pu
        JOIN users u ON u.id = pu.user_id AND u.organization_id = pu.organization_id
        LEFT JOIN site_members sm ON sm.site_id = pu.project_id AND sm.user_id = pu.user_id
        LEFT JOIN user_roles ur ON ur.user_id = sm.user_id AND ur.role_id = sm.role_id
        LEFT JOIN roles r ON r.id = ur.role_id
        WHERE pu.project_id = $1 AND ($2::uuid IS NULL OR pu.user_id = $2)
        GROUP BY pu.project_id, u.id
        ORDER BY u.last_name, u.first_name, u.id
      `,
      [projectId, userId],
    );
    return result.rows;
  }
}
