import type { Response } from "supertest";

import type { DatabaseService } from "../database/database.service.js";
import type { JsonObject } from "../database/database.types.js";
import type { ArchitectDashboardResponseDto } from "./architect-dashboard.dto.js";
import { architectDashboardViewedAuditAction } from "./architect-dashboard.types.js";

interface CreateArchitectIfcFileOptions {
  readonly metadata?: JsonObject;
  readonly originalName?: string;
  readonly sizeBytes?: number;
}

interface CreateArchitectBimModelOptions {
  readonly notes?: string | null;
  readonly version?: string;
}

interface CreateArchitectAnnotationOptions {
  readonly comment?: string | null;
  readonly title?: string;
}

export interface ArchitectDashboardAuditLog {
  readonly action: string;
  readonly actor_user_id: string | null;
  readonly metadata: JsonObject;
  readonly organization_id: string;
}

export async function setArchitectSiteMemberRoles(
  databaseService: DatabaseService,
  siteId: string,
  userId: string,
  roleCodes: readonly string[],
): Promise<void> {
  await databaseService.query("DELETE FROM site_members WHERE site_id = $1 AND user_id = $2", [
    siteId,
    userId,
  ]);
  await databaseService.query(
    `
      INSERT INTO site_members (site_id, user_id, role_id)
      SELECT $1, $2, roles.id FROM roles WHERE roles.code = ANY($3::varchar[])
    `,
    [siteId, userId, [...roleCodes]],
  );
}

export async function createArchitectIfcFile(
  databaseService: DatabaseService,
  organizationId: string,
  siteId: string,
  uploadedBy: string,
  options: CreateArchitectIfcFileOptions = {},
): Promise<string> {
  const originalName = options.originalName ?? "modele-architecte.ifc";
  const result = await databaseService.query<{ readonly id: string }>(
    `
      INSERT INTO files
        (
          organization_id,
          site_id,
          uploaded_by,
          category,
          original_name,
          mime_type,
          storage_provider,
          container_name,
          blob_path,
          size_bytes,
          metadata
        )
      VALUES ($1, $2, $3, 'bim_ifc', $4, $5, 'local', 'bim-models', $6, $7, $8::jsonb)
      RETURNING id
    `,
    [
      organizationId,
      siteId,
      uploadedBy,
      originalName,
      "application/x-step",
      `bim/${siteId}/${originalName}`,
      options.sizeBytes ?? 4096,
      JSON.stringify(options.metadata ?? { ifcStatus: "available" }),
    ],
  );
  const fileId = result.rows[0]?.id;

  if (!fileId) {
    throw new Error("Fichier IFC dashboard non créé.");
  }

  return fileId;
}

export async function createArchitectBimModel(
  databaseService: DatabaseService,
  siteId: string,
  uploadedBy: string,
  fileId: string,
  options: CreateArchitectBimModelOptions = {},
): Promise<string> {
  const result = await databaseService.query<{ readonly id: string }>(
    `
      INSERT INTO bim_models (site_id, uploaded_by, file_id, version, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
    [siteId, uploadedBy, fileId, options.version ?? "v1", options.notes ?? null],
  );
  const modelId = result.rows[0]?.id;

  if (!modelId) {
    throw new Error("Modèle BIM dashboard non créé.");
  }

  return modelId;
}

export async function createArchitectAnnotation(
  databaseService: DatabaseService,
  siteId: string,
  createdBy: string,
  bimModelId: string | null,
  options: CreateArchitectAnnotationOptions = {},
): Promise<string> {
  const result = await databaseService.query<{ readonly id: string }>(
    `
      INSERT INTO ar_annotations (site_id, bim_model_id, created_by, title, comment, position)
      VALUES ($1, $2, $3, $4, $5, '{}'::jsonb)
      RETURNING id
    `,
    [
      siteId,
      bimModelId,
      createdBy,
      options.title ?? "Annotation architecte",
      options.comment ?? "Contrôle à réaliser sur le modèle.",
    ],
  );
  const annotationId = result.rows[0]?.id;

  if (!annotationId) {
    throw new Error("Annotation architecte dashboard non créée.");
  }

  return annotationId;
}

export function parseArchitectDashboardResponse(response: Response): ArchitectDashboardResponseDto {
  return JSON.parse(response.text) as ArchitectDashboardResponseDto;
}

export async function findLatestArchitectDashboardAuditLog(
  databaseService: DatabaseService,
  organizationId: string,
): Promise<ArchitectDashboardAuditLog | null> {
  const result = await databaseService.query<ArchitectDashboardAuditLog>(
    `
      SELECT organization_id, actor_user_id, action, metadata
      FROM organization_audit_logs
      WHERE organization_id = $1
        AND action = $2
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [organizationId, architectDashboardViewedAuditAction],
  );

  return result.rows[0] ?? null;
}
