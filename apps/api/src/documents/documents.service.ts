import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import type { AccessTokenPayload } from "../auth/auth.types.js";
import { OrganizationsService } from "../organizations/organizations.service.js";
import type {
  DocumentListResponseDto,
  DocumentResponseDto,
  UploadDocumentRequestDto,
} from "./documents.dto.js";
import { DocumentsRepository } from "./documents.repository.js";
import { DocumentsStorage } from "./documents.storage.js";
import type {
  DocumentsRepositoryPort,
  DownloadableDocument,
  MulterFile,
  StoragePort,
} from "./documents.types.js";

const documentManagementRoleCodes = ["chef_chantier", "administrateur"] as const;

@Injectable()
export class DocumentsService {
  public constructor(
    @Inject(DocumentsRepository) private readonly documentsRepository: DocumentsRepositoryPort,
    @Inject(OrganizationsService) private readonly organizationsService: OrganizationsService,
    @Inject(DocumentsStorage) private readonly storage: StoragePort,
  ) {}

  public async uploadDocument(
    siteId: string,
    request: UploadDocumentRequestDto,
    file: MulterFile,
    user: AccessTokenPayload,
  ): Promise<DocumentResponseDto> {
    await this.organizationsService.assertUserHasAnyRole(
      user.organizationId,
      user,
      documentManagementRoleCodes,
    );

    await this.assertSiteInOrganization(siteId, user.organizationId);

    const blobPath = `sites/${siteId}/documents/${randomUUID()}/${file.originalname}`;

    const document = await this.documentsRepository.uploadDocument({
      blobPath,
      documentType: request.documentType,
      mimeType: file.mimetype,
      originalName: file.originalname,
      organizationId: user.organizationId,
      sizeBytes: file.size,
      siteId,
      title: request.title.trim(),
      uploadedBy: user.sub,
    });

    // Sauvegarde sur disque après l'insertion en base pour garantir la cohérence métadonnées ↔ fichier.
    await this.storage.save(blobPath, file.buffer);

    return document;
  }

  public async listDocuments(
    siteId: string,
    user: AccessTokenPayload,
  ): Promise<DocumentListResponseDto> {
    await this.assertSiteInOrganization(siteId, user.organizationId);

    const documents = await this.documentsRepository.findDocumentsBySiteAndOrganization(
      siteId,
      user.organizationId,
    );

    return { documents, siteId };
  }

  public async downloadDocument(
    documentId: string,
    siteId: string,
    user: AccessTokenPayload,
  ): Promise<DownloadableDocument> {
    await this.assertSiteInOrganization(siteId, user.organizationId);

    const document = await this.documentsRepository.findDocumentForDownload(
      documentId,
      siteId,
      user.organizationId,
    );

    if (!document) {
      throw new NotFoundException(["Le document est introuvable."]);
    }

    const buffer = await this.storage.read(document.blobPath);

    return { buffer, mimeType: document.mimeType, originalName: document.originalName };
  }

  private async assertSiteInOrganization(siteId: string, organizationId: string): Promise<void> {
    const exists = await this.documentsRepository.siteExistsInOrganization(siteId, organizationId);

    if (!exists) {
      throw new NotFoundException(["Le chantier est introuvable."]);
    }
  }
}
