import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";
import { Type } from "class-transformer";

import {
  partnerRequestsDefaultPageSize,
  partnerRequestsMaxPageSize,
  type PartnerType,
} from "./partner-requests.types.js";

export class ListPartnerRequestsQueryDto {
  @ApiPropertyOptional({ enum: ["architect", "drone"], example: "architect" })
  @IsOptional()
  @IsIn(["architect", "drone"], {
    message: "Le type de partenaire doit être 'architect' ou 'drone'.",
  })
  public readonly partnerType?: PartnerType;

  @ApiPropertyOptional({ example: "f47ac10b-58cc-4372-a567-0e02b2c3d479", type: String })
  @IsOptional()
  @IsUUID("4", { message: "Le chantier doit être identifié par un UUID valide." })
  public readonly siteId?: string;

  @ApiPropertyOptional({ default: 1, example: 1, minimum: 1, type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "La page doit être un nombre entier." })
  @Min(1, { message: "La page doit être supérieure ou égale à 1." })
  public readonly page?: number;

  @ApiPropertyOptional({
    default: partnerRequestsDefaultPageSize,
    example: partnerRequestsDefaultPageSize,
    maximum: partnerRequestsMaxPageSize,
    minimum: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: "La taille de page doit être un nombre entier." })
  @Min(1, { message: "La taille de page doit être supérieure ou égale à 1." })
  @Max(partnerRequestsMaxPageSize, {
    message: `La taille de page doit être inférieure ou égale à ${String(partnerRequestsMaxPageSize)}.`,
  })
  public readonly pageSize?: number;
}

export class PartnerRequestResponseDto {
  @ApiProperty({ example: "f47ac10b-58cc-4372-a567-0e02b2c3d479", type: String })
  public readonly id!: string;

  @ApiProperty({ enum: ["architect", "drone"], example: "architect" })
  public readonly partnerType!: PartnerType;

  @ApiProperty({ example: "a567-0e02b2c3d479-f47ac10b", type: String })
  public readonly siteId!: string;

  @ApiProperty({ example: "Chantier Lyon Part-Dieu", type: String })
  public readonly siteName!: string;

  @ApiProperty({
    example: "Avis technique sur la stabilité de la structure avant extension",
    nullable: true,
    type: String,
  })
  public readonly missionDescription!: string | null;

  @ApiProperty({ example: "2026-07-01", nullable: true, type: String })
  public readonly requestedDate!: string | null;

  @ApiProperty({ example: "pending", type: String })
  public readonly status!: string;

  @ApiProperty({ example: "2026-06-01T10:00:00.000Z", type: String })
  public readonly createdAt!: string;

  @ApiProperty({ example: "2026-06-01T10:00:00.000Z", type: String })
  public readonly updatedAt!: string;
}

export class PartnerRequestsResponseDto {
  @ApiProperty({ type: [PartnerRequestResponseDto] })
  public readonly items!: readonly PartnerRequestResponseDto[];

  @ApiProperty({ example: 1, type: Number })
  public readonly page!: number;

  @ApiProperty({ example: partnerRequestsDefaultPageSize, type: Number })
  public readonly pageSize!: number;

  @ApiProperty({ example: 2, type: Number })
  public readonly total!: number;
}
