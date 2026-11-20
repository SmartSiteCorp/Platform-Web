import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsString, MaxLength } from "class-validator";

import { allowedDocumentTypes } from "./documents.types.js";

export const documentTitleMaxLength = 180;

export class UploadDocumentRequestDto {
  @ApiProperty({ example: "Devis toiture", maxLength: documentTitleMaxLength, type: String })
  @IsString({ message: "Le titre doit être une chaîne de caractères." })
  @IsNotEmpty({ message: "Le titre du document est obligatoire." })
  @MaxLength(documentTitleMaxLength, { message: "Le titre du document est trop long." })
  public readonly title!: string;

  @ApiProperty({
    enum: allowedDocumentTypes,
    example: "devis",
    type: String,
  })
  @IsString({ message: "Le type de document doit être une chaîne de caractères." })
  @IsIn([...allowedDocumentTypes], {
    message: `Le type de document doit être l'un des suivants : ${allowedDocumentTypes.join(", ")}.`,
  })
  public readonly documentType!: string;
}

export class DocumentFileResponseDto {
  @ApiProperty({ example: "3f66f364-24d1-4d84-bd8a-54de605cb281", type: String })
  public readonly id!: string;

  @ApiProperty({ example: "devis-toiture.pdf", type: String })
  public readonly originalName!: string;

  @ApiProperty({ example: "application/pdf", type: String })
  public readonly mimeType!: string;

  @ApiProperty({ example: 204800, type: Number })
  public readonly sizeBytes!: number;

  @ApiProperty({ example: "2026-06-23T10:00:00.000Z", type: String })
  public readonly createdAt!: string;
}

export class DocumentResponseDto {
  @ApiProperty({ example: "f47ac10b-58cc-4372-a567-0e02b2c3d479", type: String })
  public readonly id!: string;

  @ApiProperty({ example: "a567-0e02b2c3d479-f47ac10b", type: String })
  public readonly siteId!: string;

  @ApiProperty({ example: "3f66f364-24d1-4d84-bd8a-54de605cb281", type: String })
  public readonly fileId!: string;

  @ApiProperty({ example: "Devis toiture", type: String })
  public readonly title!: string;

  @ApiProperty({ enum: allowedDocumentTypes, example: "devis", type: String })
  public readonly documentType!: string;

  @ApiProperty({ type: DocumentFileResponseDto })
  public readonly file!: DocumentFileResponseDto;

  @ApiProperty({ example: "2026-06-23T10:00:00.000Z", type: String })
  public readonly createdAt!: string;
}

export class DocumentListResponseDto {
  @ApiProperty({ example: "a567-0e02b2c3d479-f47ac10b", type: String })
  public readonly siteId!: string;

  @ApiProperty({ isArray: true, type: DocumentResponseDto })
  public readonly documents!: readonly DocumentResponseDto[];
}
