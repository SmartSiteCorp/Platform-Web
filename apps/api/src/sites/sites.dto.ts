import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min } from "class-validator";

export const siteNameMaxLength = 180;
export const siteAddressMaxLength = 500;

export class CreateSiteRequestDto {
  @ApiProperty({ example: "Chantier Renaud", maxLength: siteNameMaxLength, type: String })
  @IsString({ message: "Le nom du chantier doit être une chaîne de caractères." })
  @IsNotEmpty({ message: "Le nom du chantier est obligatoire." })
  @MaxLength(siteNameMaxLength, { message: "Le nom du chantier est trop long." })
  public readonly name!: string;

  @ApiPropertyOptional({
    example: "12 rue des Artisans, 75001 Paris",
    maxLength: siteAddressMaxLength,
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsString({ message: "L'adresse doit être une chaîne de caractères." })
  @MaxLength(siteAddressMaxLength, { message: "L'adresse est trop longue." })
  public readonly address?: string | null;

  @ApiPropertyOptional({ example: "2026-07-01", nullable: true, type: String })
  @IsOptional()
  @IsString({ message: "La date de début doit être une chaîne de caractères." })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "La date de début doit être au format YYYY-MM-DD.",
  })
  public readonly startDate?: string | null;

  @ApiPropertyOptional({ example: 90, minimum: 1, nullable: true, type: Number })
  @IsOptional()
  @IsInt({ message: "La durée estimée doit être un entier." })
  @Min(1, { message: "La durée estimée doit être d'au moins 1 jour." })
  public readonly estimatedDurationDays?: number | null;
}

export class SiteResponseDto {
  @ApiProperty({ example: "f47ac10b-58cc-4372-a567-0e02b2c3d479", type: String })
  public readonly id!: string;

  @ApiProperty({ example: "3f66f364-24d1-4d84-bd8a-54de605cb281", type: String })
  public readonly organizationId!: string;

  @ApiProperty({ example: "Chantier Renaud", type: String })
  public readonly name!: string;

  @ApiProperty({ example: "12 rue des Artisans, 75001 Paris", nullable: true, type: String })
  public readonly address!: string | null;

  @ApiProperty({ example: "2026-07-01", nullable: true, type: String })
  public readonly startDate!: string | null;

  @ApiProperty({ example: 90, nullable: true, type: Number })
  public readonly estimatedDurationDays!: number | null;

  @ApiProperty({ example: "planned", type: String })
  public readonly status!: string;

  @ApiProperty({ example: "8f3de370-2782-4c32-8c3e-92d7f451d7c5", type: String })
  public readonly createdBy!: string;

  @ApiProperty({ example: "2026-06-01T10:00:00.000Z", type: String })
  public readonly createdAt!: string;

  @ApiProperty({ example: "2026-06-01T10:00:00.000Z", type: String })
  public readonly updatedAt!: string;
}
