import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Matches, MaxLength } from "class-validator";

export const architectRequestMissionDescriptionMaxLength = 1000;

export class CreateArchitectRequestRequestDto {
  @ApiPropertyOptional({
    example: "Avis technique sur la stabilité de la structure avant extension",
    maxLength: architectRequestMissionDescriptionMaxLength,
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsString({ message: "La description de la mission doit être une chaîne de caractères." })
  @MaxLength(architectRequestMissionDescriptionMaxLength, {
    message: "La description de la mission est trop longue.",
  })
  public readonly missionDescription?: string | null;

  @ApiPropertyOptional({ example: "2026-07-01", nullable: true, type: String })
  @IsOptional()
  @IsString({ message: "La date souhaitée doit être une chaîne de caractères." })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "La date souhaitée doit être au format YYYY-MM-DD.",
  })
  public readonly requestedDate?: string | null;
}

export class ArchitectRequestResponseDto {
  @ApiProperty({ example: "f47ac10b-58cc-4372-a567-0e02b2c3d479", type: String })
  public readonly id!: string;

  @ApiProperty({ example: "a567-0e02b2c3d479-f47ac10b", type: String })
  public readonly siteId!: string;

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

export class ArchitectRequestsResponseDto {
  @ApiProperty({ example: "a567-0e02b2c3d479-f47ac10b", type: String })
  public readonly siteId!: string;

  @ApiProperty({ type: [ArchitectRequestResponseDto] })
  public readonly architectRequests!: readonly ArchitectRequestResponseDto[];
}
