import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export const organizationNameMaxLength = 180;
export const organizationEmailMaxLength = 320;
export const organizationPhoneMaxLength = 40;
export const organizationAddressMaxLength = 500;

export class UpdateOrganizationRequestDto {
  @ApiProperty({ example: "Stern Tech", maxLength: organizationNameMaxLength, type: String })
  @IsString({ message: "Le nom d'entreprise doit être une chaîne de caractères." })
  @IsNotEmpty({ message: "Le nom d'entreprise est obligatoire." })
  @MaxLength(organizationNameMaxLength, { message: "Le nom d'entreprise est trop long." })
  public readonly name!: string;

  @ApiProperty({
    example: "contact@smartsite.fr",
    maxLength: organizationEmailMaxLength,
    type: String,
  })
  @IsString({ message: "L'email doit être une chaîne de caractères." })
  @IsNotEmpty({ message: "L'email est obligatoire." })
  @IsEmail({}, { message: "L'email doit être valide." })
  @MaxLength(organizationEmailMaxLength, { message: "L'email est trop long." })
  public readonly email!: string;

  @ApiPropertyOptional({
    example: "+33123456789",
    maxLength: organizationPhoneMaxLength,
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsString({ message: "Le téléphone doit être une chaîne de caractères." })
  @MaxLength(organizationPhoneMaxLength, { message: "Le téléphone est trop long." })
  public readonly phone?: string | null;

  @ApiPropertyOptional({
    example: "12 rue des Artisans, 75001 Paris",
    maxLength: organizationAddressMaxLength,
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsString({ message: "L'adresse doit être une chaîne de caractères." })
  @MaxLength(organizationAddressMaxLength, { message: "L'adresse est trop longue." })
  public readonly address?: string | null;
}

export class OrganizationResponseDto {
  @ApiProperty({ example: "3f66f364-24d1-4d84-bd8a-54de605cb281", type: String })
  public readonly id!: string;

  @ApiProperty({ example: "Stern Tech", type: String })
  public readonly name!: string;

  @ApiProperty({ example: "contact@smartsite.fr", nullable: true, type: String })
  public readonly email!: string | null;

  @ApiProperty({ example: "+33123456789", nullable: true, type: String })
  public readonly phone!: string | null;

  @ApiProperty({ example: "12 rue des Artisans, 75001 Paris", nullable: true, type: String })
  public readonly address!: string | null;

  @ApiProperty({ example: "2026-06-01T10:00:00.000Z", type: String })
  public readonly createdAt!: string;

  @ApiProperty({ example: "2026-06-01T10:00:00.000Z", type: String })
  public readonly updatedAt!: string;
}

export class OrganizationUserResponseDto {
  @ApiProperty({ example: "8f3de370-2782-4c32-8c3e-92d7f451d7c5", type: String })
  public readonly id!: string;

  @ApiProperty({ example: "3f66f364-24d1-4d84-bd8a-54de605cb281", type: String })
  public readonly organizationId!: string;

  @ApiProperty({ example: "ouvrier@smartsite.fr", type: String })
  public readonly email!: string;

  @ApiProperty({ example: "Armand", type: String })
  public readonly firstName!: string;

  @ApiProperty({ example: "Braud", type: String })
  public readonly lastName!: string;

  @ApiProperty({ example: "+33123456789", nullable: true, type: String })
  public readonly phone!: string | null;

  @ApiProperty({ example: "active", type: String })
  public readonly status!: string;

  @ApiProperty({ example: ["chef_chantier", "droniste"], isArray: true, type: String })
  public readonly roleCodes!: readonly string[];

  @ApiProperty({ example: "2026-06-01T10:00:00.000Z", type: String })
  public readonly createdAt!: string;
}

export class OrganizationUsersResponseDto {
  @ApiProperty({ example: "3f66f364-24d1-4d84-bd8a-54de605cb281", type: String })
  public readonly organizationId!: string;

  @ApiProperty({ isArray: true, type: OrganizationUserResponseDto })
  public readonly users!: readonly OrganizationUserResponseDto[];
}
