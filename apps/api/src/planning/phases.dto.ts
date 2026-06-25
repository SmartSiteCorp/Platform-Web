import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min } from "class-validator";

export const phaseNameMaxLength = 180;
export const phaseDescriptionMaxLength = 1000;

export class CreatePhaseRequestDto {
  @ApiProperty({ example: "Gros œuvre", maxLength: phaseNameMaxLength, type: String })
  @IsString({ message: "Le nom de la phase doit être une chaîne de caractères." })
  @IsNotEmpty({ message: "Le nom de la phase est obligatoire." })
  @MaxLength(phaseNameMaxLength, { message: "Le nom de la phase est trop long." })
  public readonly name!: string;

  @ApiPropertyOptional({
    example: "Fondations et structure principale",
    maxLength: phaseDescriptionMaxLength,
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsString({ message: "La description doit être une chaîne de caractères." })
  @MaxLength(phaseDescriptionMaxLength, { message: "La description est trop longue." })
  public readonly description?: string | null;

  @ApiPropertyOptional({ example: "2026-07-01", nullable: true, type: String })
  @IsOptional()
  @IsString({ message: "La date de début doit être une chaîne de caractères." })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "La date de début doit être au format YYYY-MM-DD.",
  })
  public readonly startDate?: string | null;

  @ApiPropertyOptional({ example: 30, minimum: 1, nullable: true, type: Number })
  @IsOptional()
  @IsInt({ message: "La durée estimée doit être un entier." })
  @Min(1, { message: "La durée estimée doit être d'au moins 1 jour." })
  public readonly estimatedDurationDays?: number | null;
}

export class PhaseResponseDto {
  @ApiProperty({ example: "f47ac10b-58cc-4372-a567-0e02b2c3d479", type: String })
  public readonly id!: string;

  @ApiProperty({ example: "a567-0e02b2c3d479-f47ac10b", type: String })
  public readonly siteId!: string;

  @ApiProperty({ example: "Gros œuvre", type: String })
  public readonly name!: string;

  @ApiProperty({ example: "Fondations et structure principale", nullable: true, type: String })
  public readonly description!: string | null;

  @ApiProperty({ example: 1, type: Number })
  public readonly position!: number;

  @ApiProperty({ example: "2026-07-01", nullable: true, type: String })
  public readonly startDate!: string | null;

  @ApiProperty({ example: 30, nullable: true, type: Number })
  public readonly estimatedDurationDays!: number | null;

  @ApiProperty({ example: 0, type: Number })
  public readonly progressPercent!: number;

  @ApiProperty({ example: "planned", type: String })
  public readonly status!: string;

  @ApiProperty({ example: "2026-06-01T10:00:00.000Z", type: String })
  public readonly createdAt!: string;

  @ApiProperty({ example: "2026-06-01T10:00:00.000Z", type: String })
  public readonly updatedAt!: string;
}
