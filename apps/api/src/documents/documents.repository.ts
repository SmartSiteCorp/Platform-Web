import { Inject, Injectable } from "@nestjs/common";
import type { QueryResultRow } from "pg";

import { DatabaseService } from "../database/database.service.js";
import type {
  DocumentDetails,
  DocumentFileDetails,
  DocumentsRepositoryPort,
  UploadDocumentInput,
} from "./documents.types.js";
import { mimeTypeToFileCategory } from "./documents.types.js";

interface FileRow extends QueryResultRow {
  readonly id: string;
  readonly original_name: string;
  readonly mime_type: string;
  readonly size_bytes: string;
  readonly created_at: Date;
}

interface DocumentRow extends QueryResultRow {
  readonly id: string;
  readonly site_id: string;
  readonly file_id: string;
  readonly title: string;
  readonly document_type: string;
  readonly created_at: Date;
  readonly file_original_name: string;
  readonly file_mime_type: string;
  readonly file_size_bytes: string;
  readonly file_created_at: Date;
}

const storageProvider = "local";
const containerName = "uploads";

@Injectable()
export class DocumentsRepository implements DocumentsRepositoryPort {
  public constructor(@Inject(DatabaseService) private readonly databaseService: DatabaseService) {}

  public async siteExistsInOrganization(siteId: string, organizationId: string): Promise<boolean> {
    const result = await this.databaseService.query<{ readonly id: string }>(
      `SELECT id FROM sites WHERE id = $1 AND organization_id = $2`,
      [siteId, organizationId],
    );

    return result.rows.length > 0;
  }

  public async uploadDocument(input: UploadDocumentInput): Promise<DocumentDetails> {
    return this.databaseService.withTransaction(async (transaction) => {
      const category = mimeTypeToFileCategory[input.mimeType] ?? "document";

      const fileResult = await transaction.query<FileRow>(
        `
          INSERT INTO files
            (organization_id, site_id, uploaded_by, category, original_name,
             mime_type, storage_provider, container_name, blob_path, size_bytes)
          VALUES ($1, $2, $3, $4::file_category, $5, $6, $7, $8, $9, $10)
          RETURNING id, original_name, mime_type, size_bytes, created_at
        `,
        [
          input.organizationId,
          input.siteId,
          input.uploadedBy,
          category,
          input.originalName,
          input.mimeType,
          storageProvider,
          containerName,
          input.blobPath,
          input.sizeBytes,
        ],
      );

      const file = fileResult.rows[0];

      if (!file) {
        throw new Error("Le fichier n'a pas pu être enregistré.");
      }

      const documentResult = await transaction.query<{
        readonly id: string;
        readonly site_id: string;
        readonly file_id: string;
        readonly title: string;
        readonly document_type: string;
        readonly created_at: Date;
      }>(
        `
          INSERT INTO documents (site_id, file_id, title, document_type)
          VALUES ($1, $2, $3, $4)
          RETURNING id, site_id, file_id, title, document_type, created_at
        `,
        [input.siteId, file.id, input.title, input.documentType],
      );

      const document = documentResult.rows[0];

      if (!document) {
        throw new Error("Le document n'a pas pu être enregistré.");
      }

      return this.mapDocument(document, file);
    });
  }

  public async findDocumentsBySiteAndOrganization(
    siteId: string,
    organizationId: string,
  ): Promise<readonly DocumentDetails[]> {
    const result = await this.databaseService.query<DocumentRow>(
      `
        SELECT
          d.id, d.site_id, d.file_id, d.title, d.document_type, d.created_at,
          f.original_name AS file_original_name,
          f.mime_type AS file_mime_type,
          f.size_bytes AS file_size_bytes,
          f.created_at AS file_created_at
        FROM documents d
        JOIN files f ON f.id = d.file_id
        JOIN sites s ON s.id = d.site_id
        WHERE d.site_id = $1 AND s.organization_id = $2
        ORDER BY d.created_at DESC
      `,
      [siteId, organizationId],
    );

    return result.rows.map((row) =>
      this.mapDocument(
        {
          created_at: row.created_at,
          document_type: row.document_type,
          file_id: row.file_id,
          id: row.id,
          site_id: row.site_id,
          title: row.title,
        },
        {
          created_at: row.file_created_at,
          id: row.file_id,
          mime_type: row.file_mime_type,
          original_name: row.file_original_name,
          size_bytes: row.file_size_bytes,
        },
      ),
    );
  }

  private mapDocument(
    doc: {
      readonly id: string;
      readonly site_id: string;
      readonly file_id: string;
      readonly title: string;
      readonly document_type: string;
      readonly created_at: Date;
    },
    file: FileRow,
  ): DocumentDetails {
    const fileDetails: DocumentFileDetails = {
      createdAt: file.created_at.toISOString(),
      id: file.id,
      mimeType: file.mime_type,
      originalName: file.original_name,
      sizeBytes: Number(file.size_bytes),
    };

    return {
      createdAt: doc.created_at.toISOString(),
      documentType: doc.document_type,
      file: fileDetails,
      fileId: doc.file_id,
      id: doc.id,
      siteId: doc.site_id,
      title: doc.title,
    };
  }
}
