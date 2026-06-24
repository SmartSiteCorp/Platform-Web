import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import type { AccessTokenPayload } from "../auth/auth.types.js";
import { OrganizationsService } from "../organizations/organizations.service.js";
import type {
  DocumentListResponseDto,
  DocumentResponseDto,
  UploadDocumentRequestDto,
} from "./documents.dto.js";
import type { MulterFile } from "./documents.types.js";
import { DocumentsRepository } from "./documents.repository.js";
import type { DocumentsRepositoryPort } from "./documents.types.js";

const documentManagementRoleCodes = ["chef_chantier", "administrateur"] as const;

@Injectable()
export class DocumentsService {
  public constructor(
    @Inject(DocumentsRepository) private readonly documentsRepository: DocumentsRepositoryPort,
    @Inject(OrganizationsService) private readonly organizationsService: OrganizationsService,
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

  private async assertSiteInOrganization(
    siteId: string,
    organizationId: string,
  ): Promise<void> {
    const exists = await this.documentsRepository.siteExistsInOrganization(
      siteId,
      organizationId,
    );

    if (!exists) {
      throw new NotFoundException(["Le chantier est introuvable."]);
    }
  }
}
