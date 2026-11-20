import type { QueryResultRow } from "pg";

import type { JsonObject, JsonValue } from "../database/database.types.js";
import {
  architectIfcFileStatuses,
  type ArchitectAiAnomalySeverity,
  type ArchitectAiAnomalySummary,
  type ArchitectAnnotationSummary,
  type ArchitectIfcFileStatus,
  type ArchitectIfcModelSummary,
  type ArchitectProjectSummary,
} from "./architect-dashboard.types.js";

export interface ArchitectProjectRow extends QueryResultRow {
  readonly id: string;
  readonly name: string;
  readonly address: string | null;
  readonly status: string;
  readonly ifc_model_count: number;
  readonly recent_annotations_count: number;
  readonly active_ai_anomalies_count: number;
  readonly critical_ai_anomalies_count: number;
  readonly latest_ifc_model_id: string | null;
  readonly latest_ifc_version: string | null;
  readonly latest_ifc_created_at: Date | null;
  readonly latest_ifc_file_id: string | null;
  readonly latest_ifc_file_name: string | null;
  readonly latest_ifc_file_metadata: JsonObject | null;
}

export interface ArchitectIfcModelRow extends QueryResultRow {
  readonly id: string;
  readonly site_id: string;
  readonly site_name: string;
  readonly file_id: string;
  readonly file_name: string;
  readonly version: string;
  readonly notes: string | null;
  readonly file_metadata: JsonObject;
  readonly created_at: Date;
}

export interface ArchitectAnnotationRow extends QueryResultRow {
  readonly id: string;
  readonly site_id: string;
  readonly site_name: string;
  readonly bim_model_id: string | null;
  readonly title: string;
  readonly comment: string | null;
  readonly created_at: Date;
}

export interface ArchitectAiAnomalyRow extends QueryResultRow {
  readonly id: string;
  readonly site_id: string;
  readonly site_name: string;
  readonly type: string;
  readonly severity: ArchitectAiAnomalySeverity;
  readonly description: string;
  readonly recommendation: string | null;
  readonly status: string;
  readonly detected_at: Date;
}

export function mapArchitectProjectSummary(row: ArchitectProjectRow): ArchitectProjectSummary {
  const ifcStatus =
    row.latest_ifc_model_id === null ? "missing" : resolveIfcStatus(row.latest_ifc_file_metadata);

  return {
    activeAiAnomaliesCount: row.active_ai_anomalies_count,
    address: row.address,
    bimValidationStatus: "pending",
    criticalAiAnomaliesCount: row.critical_ai_anomalies_count,
    detailsPath: createSiteDetailsPath(row.id),
    id: row.id,
    ifcModelCount: row.ifc_model_count,
    ifcModelPath: createOptionalModelDetailsPath(row.latest_ifc_model_id),
    ifcStatus,
    latestIfcCreatedAt: row.latest_ifc_created_at?.toISOString() ?? null,
    latestIfcFileId: row.latest_ifc_file_id,
    latestIfcFileName: row.latest_ifc_file_name,
    latestIfcModelId: row.latest_ifc_model_id,
    latestIfcVersion: row.latest_ifc_version,
    name: row.name,
    recentAnnotationsCount: row.recent_annotations_count,
    status: row.status,
  };
}

export function mapArchitectIfcModelSummary(row: ArchitectIfcModelRow): ArchitectIfcModelSummary {
  return {
    createdAt: row.created_at.toISOString(),
    detailsPath: createModelDetailsPath(row.id),
    fileId: row.file_id,
    fileName: row.file_name,
    id: row.id,
    notes: row.notes,
    siteId: row.site_id,
    siteName: row.site_name,
    status: resolveIfcStatus(row.file_metadata),
    version: row.version,
  };
}

export function mapArchitectAnnotationSummary(
  row: ArchitectAnnotationRow,
): ArchitectAnnotationSummary {
  return {
    bimModelId: row.bim_model_id,
    comment: row.comment,
    createdAt: row.created_at.toISOString(),
    detailsPath: createAnnotationDetailsPath(row),
    id: row.id,
    siteId: row.site_id,
    siteName: row.site_name,
    title: row.title,
  };
}

export function mapArchitectAiAnomalySummary(
  row: ArchitectAiAnomalyRow,
): ArchitectAiAnomalySummary {
  return {
    description: row.description,
    detailsPath: `${createSiteDetailsPath(row.site_id)}/alerts/${row.id}`,
    detectedAt: row.detected_at.toISOString(),
    id: row.id,
    recommendation: row.recommendation,
    severity: row.severity,
    siteId: row.site_id,
    siteName: row.site_name,
    status: row.status,
    type: row.type,
  };
}

function resolveIfcStatus(metadata: JsonObject | null): ArchitectIfcFileStatus {
  const status = readMetadataString(metadata, ["ifcStatus", "status", "processingStatus"]);

  return isIfcFileStatus(status) && status !== "missing" ? status : "available";
}

function readMetadataString(metadata: JsonObject | null, keys: readonly string[]): string | null {
  if (!metadata) {
    return null;
  }

  for (const key of keys) {
    const value = metadata[key];

    if (typeof value === "string") {
      return value;
    }
  }

  return null;
}

function isIfcFileStatus(value: JsonValue | null): value is ArchitectIfcFileStatus {
  return typeof value === "string" && architectIfcFileStatuses.some((status) => status === value);
}

function createOptionalModelDetailsPath(modelId: string | null): string | null {
  return modelId ? createModelDetailsPath(modelId) : null;
}

function createModelDetailsPath(modelId: string): string {
  return `/bim/models/${modelId}`;
}

function createAnnotationDetailsPath(row: ArchitectAnnotationRow): string {
  return row.bim_model_id
    ? `${createModelDetailsPath(row.bim_model_id)}/annotations/${row.id}`
    : `${createSiteDetailsPath(row.site_id)}/annotations/${row.id}`;
}

function createSiteDetailsPath(siteId: string): string {
  return `/sites/${siteId}`;
}
