import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

import {
  passwordComplexityPattern,
  passwordMaxLength,
  passwordMinLength,
} from "../auth/password-policy.js";
import { RegisterResponseDto } from "../auth/auth.dto.js";
import { organizationEmailMaxLength, organizationPhoneMaxLength } from "./organizations.dto.js";

export const invitationMaxRoleCount = 5;
export const invitationRoleCodeMaxLength = 80;
export const invitationTokenMaxLength = 128;

export class CreateOrganizationInvitationRequestDto {
  @ApiProperty({
    example: "ouvrier@smartsite.test",
    maxLength: organizationEmailMaxLength,
    type: String,
  })
  @IsEmail({}, { message: "L'email doit être valide." })
  @MaxLength(organizationEmailMaxLength, { message: "L'email est trop long." })
  public readonly email!: string;

  @ApiProperty({
    example: ["chef_chantier", "droniste"],
    isArray: true,
    maxItems: invitationMaxRoleCount,
    type: String,
  })
  @IsArray({ message: "Les rôles doivent être fournis sous forme de liste." })
  @ArrayNotEmpty({ message: "Au moins un rôle doit être sélectionné." })
  @ArrayMaxSize(invitationMaxRoleCount, { message: "Trop de rôles sont sélectionnés." })
  @ArrayUnique({ message: "Un rôle ne doit pas être sélectionné plusieurs fois." })
  @IsString({ each: true, message: "Chaque rôle doit être une chaîne de caractères." })
  @IsNotEmpty({ each: true, message: "Chaque rôle doit être renseigné." })
  @MaxLength(invitationRoleCodeMaxLength, {
    each: true,
    message: "Un code rôle est trop long.",
  })
  public readonly roleCodes!: readonly string[];
}

export class OrganizationInvitationResponseDto {
  @ApiProperty({ example: "1e560a7a-9f37-4fc2-8e99-f88386ad9851", type: String })
  public readonly id!: string;

  @ApiProperty({ example: "3f66f364-24d1-4d84-bd8a-54de605cb281", type: String })
  public readonly organizationId!: string;

  @ApiProperty({ example: "ouvrier@smartsite.test", type: String })
  public readonly email!: string;

  @ApiProperty({ example: ["chef_chantier", "droniste"], isArray: true, type: String })
  public readonly roleCodes!: readonly string[];

  @ApiProperty({ example: "z6gnxEaqnGd4eBLQp4FBCgva3NS0c8LEpALYp7vo-1w", type: String })
  public readonly token!: string;

  @ApiProperty({ example: "2026-06-08T10:00:00.000Z", type: String })
  public readonly expiresAt!: string;

  @ApiProperty({ example: "2026-06-01T10:00:00.000Z", type: String })
  public readonly createdAt!: string;
}

export class AcceptOrganizationInvitationRequestDto {
  @ApiProperty({ maxLength: invitationTokenMaxLength, type: String })
  @IsString({ message: "Le token d'invitation doit être une chaîne de caractères." })
  @IsNotEmpty({ message: "Le token d'invitation est obligatoire." })
  @MaxLength(invitationTokenMaxLength, { message: "Le token d'invitation est trop long." })
  public readonly token!: string;

  @ApiProperty({
    example: "ouvrier@smartsite.test",
    maxLength: organizationEmailMaxLength,
    type: String,
  })
  @IsEmail({}, { message: "L'email doit être valide." })
  @MaxLength(organizationEmailMaxLength, { message: "L'email est trop long." })
  public readonly email!: string;

  @ApiProperty({
    example: "SmartSite.2026",
    maxLength: passwordMaxLength,
    minLength: passwordMinLength,
    type: String,
  })
  @IsString({ message: "Le mot de passe doit être une chaîne de caractères." })
  @MinLength(passwordMinLength, {
    message: "Le mot de passe doit contenir au moins 12 caractères.",
  })
  @MaxLength(passwordMaxLength, { message: "Le mot de passe est trop long." })
  @Matches(passwordComplexityPattern, {
    message:
      "Le mot de passe doit contenir une majuscule, une minuscule, un chiffre et un symbole.",
  })
  public readonly password!: string;

  @ApiProperty({ example: "Julien", maxLength: 120, type: String })
  @IsString({ message: "Le prénom doit être une chaîne de caractères." })
  @IsNotEmpty({ message: "Le prénom est obligatoire." })
  @MaxLength(120, { message: "Le prénom est trop long." })
  public readonly firstName!: string;

  @ApiProperty({ example: "Test", maxLength: 120, type: String })
  @IsString({ message: "Le nom doit être une chaîne de caractères." })
  @IsNotEmpty({ message: "Le nom est obligatoire." })
  @MaxLength(120, { message: "Le nom est trop long." })
  public readonly lastName!: string;

  @ApiPropertyOptional({
    example: "+33123456789",
    maxLength: organizationPhoneMaxLength,
    type: String,
  })
  @IsOptional()
  @IsString({ message: "Le téléphone doit être une chaîne de caractères." })
  @MaxLength(organizationPhoneMaxLength, { message: "Le téléphone est trop long." })
  public readonly phone?: string;
}

export class AcceptOrganizationInvitationResponseDto extends RegisterResponseDto {}
