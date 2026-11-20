export const allowedDocumentTypes = ["devis", "plan", "rapport", "contrat", "autre"] as const;

// Interface locale pour éviter la dépendance au namespace Express.Multer (@types/express v5).
export interface MulterFile {
  readonly fieldname: string;
  readonly originalname: string;
  readonly encoding: string;
  readonly mimetype: string;
  readonly size: number;
  readonly buffer: Buffer;
}
export type DocumentType = (typeof allowedDocumentTypes)[number];

// Catégorie file_category PostgreSQL selon le MIME type du fichier uploadé.
export const mimeTypeToFileCategory: Record<string, string> = {
  "application/msword": "document",
  "application/pdf": "pdf",
  "application/vnd.ms-excel": "document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
  "image/gif": "photo",
  "image/jpeg": "photo",
  "image/png": "photo",
  "image/webp": "photo",
};

export interface DocumentFileDetails {
  readonly id: string;
  readonly originalName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly createdAt: string;
}

export interface DocumentDetails {
  readonly id: string;
  readonly siteId: string;
  readonly fileId: string;
  readonly title: string;
  readonly documentType: string;
  readonly file: DocumentFileDetails;
  readonly createdAt: string;
}

export interface UploadDocumentInput {
  readonly organizationId: string;
  readonly siteId: string;
  readonly uploadedBy: string;
  readonly title: string;
  readonly documentType: string;
  readonly originalName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly blobPath: string;
}

export interface StoragePort {
  save(blobPath: string, buffer: Buffer): Promise<void>;
  read(blobPath: string): Promise<Buffer>;
}

export interface DocumentForDownload {
  readonly id: string;
  readonly blobPath: string;
  readonly mimeType: string;
  readonly originalName: string;
}

export interface DownloadableDocument {
  readonly buffer: Buffer;
  readonly mimeType: string;
  readonly originalName: string;
}

export interface DocumentsRepositoryPort {
  siteExistsInOrganization(siteId: string, organizationId: string): Promise<boolean>;
  uploadDocument(input: UploadDocumentInput): Promise<DocumentDetails>;
  findDocumentsBySiteAndOrganization(
    siteId: string,
    organizationId: string,
  ): Promise<readonly DocumentDetails[]>;
  findDocumentForDownload(
    documentId: string,
    siteId: string,
    organizationId: string,
  ): Promise<DocumentForDownload | null>;
}
