import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Post,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { createHttpValidationPipe } from "../app-http.js";
import type { AuthenticatedRequest } from "../auth/authenticated-request.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { ApiErrorResponseDto } from "../shared/http/api-error-response.dto.js";
import {
  DocumentListResponseDto,
  DocumentResponseDto,
  UploadDocumentRequestDto,
} from "./documents.dto.js";
import { DocumentsService } from "./documents.service.js";
import { allowedDocumentTypes, type MulterFile } from "./documents.types.js";

// 50 Mo — taille maximale par document uploadé.
const maxFileSizeBytes = 50 * 1024 * 1024;

// Formats acceptés : PDF, images courantes, Word, Excel.
const allowedMimeTypePattern =
  /^(application\/pdf|image\/(jpeg|png|webp|gif)|application\/(msword|vnd\.ms-excel|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet)))$/;

@ApiBearerAuth()
@ApiTags("Sites")
@Controller("sites")
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  public constructor(
    @Inject(DocumentsService) private readonly documentsService: DocumentsService,
  ) {}

  @Post(":siteId/documents")
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiParam({ name: "siteId", type: String })
  @ApiBody({
    schema: {
      properties: {
        documentType: { enum: [...allowedDocumentTypes], type: "string" },
        file: { format: "binary", type: "string" },
        title: { maxLength: 180, type: "string" },
      },
      required: ["file", "title", "documentType"],
      type: "object",
    },
  })
  @ApiCreatedResponse({ description: "Document uploadé avec succès.", type: DocumentResponseDto })
  @ApiBadRequestResponse({ description: "Données invalides.", type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({
    description: "Token JWT manquant ou invalide.",
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: "Rôle Chef de chantier ou Administrateur requis.",
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({ description: "Chantier introuvable.", type: ApiErrorResponseDto })
  public uploadDocument(
    @Param("siteId", new ParseUUIDPipe({ version: "4" })) siteId: string,
    @Body(createHttpValidationPipe(UploadDocumentRequestDto)) body: UploadDocumentRequestDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: maxFileSizeBytes }),
          // skipMagicNumbersValidation : la validation du contenu réel sera faite au stockage (US-2203).
          new FileTypeValidator({
            fileType: allowedMimeTypePattern,
            skipMagicNumbersValidation: true,
          }),
        ],
      }),
    )
    file: MulterFile,
    @Req() req: AuthenticatedRequest,
  ): Promise<DocumentResponseDto> {
    return this.documentsService.uploadDocument(siteId, body, file, req.auth);
  }

  @Get(":siteId/documents")
  @ApiParam({ name: "siteId", type: String })
  @ApiOkResponse({ description: "Liste des documents du chantier.", type: DocumentListResponseDto })
  @ApiUnauthorizedResponse({
    description: "Token JWT manquant ou invalide.",
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({ description: "Chantier introuvable.", type: ApiErrorResponseDto })
  public listDocuments(
    @Param("siteId", new ParseUUIDPipe({ version: "4" })) siteId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<DocumentListResponseDto> {
    return this.documentsService.listDocuments(siteId, req.auth);
  }

  @Get(":siteId/documents/:documentId/download")
  @Header("Cache-Control", "no-store")
  @ApiParam({ name: "siteId", type: String })
  @ApiParam({ name: "documentId", type: String })
  @ApiProduces("application/octet-stream")
  @ApiOkResponse({ description: "Contenu binaire du document." })
  @ApiUnauthorizedResponse({
    description: "Token JWT manquant ou invalide.",
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: "Chantier ou document introuvable.",
    type: ApiErrorResponseDto,
  })
  public async downloadDocument(
    @Param("siteId", new ParseUUIDPipe({ version: "4" })) siteId: string,
    @Param("documentId", new ParseUUIDPipe({ version: "4" })) documentId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<StreamableFile> {
    const result = await this.documentsService.downloadDocument(documentId, siteId, req.auth);

    return new StreamableFile(result.buffer, {
      disposition: `attachment; filename="${encodeURIComponent(result.originalName)}"`,
      length: result.buffer.length,
      type: result.mimeType,
    });
  }
}
