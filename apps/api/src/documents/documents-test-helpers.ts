import type { QueryResultRow } from "pg";

import type { DatabaseService } from "../database/database.service.js";

export interface DocumentDatabaseRow extends QueryResultRow {
  readonly id: string;
  readonly site_id: string;
  readonly file_id: string;
  readonly title: string;
  readonly document_type: string;
}

export interface FileDatabaseRow extends QueryResultRow {
  readonly id: string;
  readonly organization_id: string;
  readonly site_id: string;
  readonly uploaded_by: string;
  readonly category: string;
  readonly original_name: string;
  readonly mime_type: string;
  readonly storage_provider: string;
  readonly container_name: string;
  readonly blob_path: string;
  readonly size_bytes: string;
}

export async function findPersistedDocument(
  databaseService: DatabaseService,
  documentId: string,
): Promise<DocumentDatabaseRow | null> {
  const result = await databaseService.query<DocumentDatabaseRow>(
    `SELECT id, site_id, file_id, title, document_type FROM documents WHERE id = $1`,
    [documentId],
  );

  return result.rows[0] ?? null;
}

export async function findPersistedFile(
  databaseService: DatabaseService,
  fileId: string,
): Promise<FileDatabaseRow | null> {
  const result = await databaseService.query<FileDatabaseRow>(
    `
      SELECT id, organization_id, site_id, uploaded_by, category,
             original_name, mime_type, storage_provider, container_name, blob_path, size_bytes
      FROM files WHERE id = $1
    `,
    [fileId],
  );

  return result.rows[0] ?? null;
}

export async function countDocumentsForSite(
  databaseService: DatabaseService,
  siteId: string,
): Promise<number> {
  const result = await databaseService.query<{ readonly count: string }>(
    `SELECT COUNT(*) AS count FROM documents WHERE site_id = $1`,
    [siteId],
  );

  return Number(result.rows[0]?.count ?? 0);
}

// Buffer minimaliste représentant un PDF valide pour les tests d'upload.
export function createTestPdfBuffer(): Buffer {
  return Buffer.from("%PDF-1.4 test document");
}

// Buffer minimaliste représentant une image PNG pour les tests d'upload.
export function createTestPngBuffer(): Buffer {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
}
