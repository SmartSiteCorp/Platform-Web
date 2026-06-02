import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
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
} from "./password-policy.js";

export class RegisterRequestDto {
  @ApiProperty({ example: "Stern Tech", maxLength: 180, type: String })
  @IsString({ message: "Le nom d'entreprise doit être une chaîne de caractères." })
  @IsNotEmpty({ message: "Le nom d'entreprise est obligatoire." })
  @MaxLength(180, { message: "Le nom d'entreprise est trop long." })
  public readonly organizationName!: string;

  @ApiProperty({ example: "andreea@smartsite.fr", maxLength: 320, type: String })
  @IsEmail({}, { message: "L'email doit être valide." })
  @MaxLength(320, { message: "L'email est trop long." })
  public readonly email!: string;

  @ApiProperty({
    example: "Password123!",
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

  @ApiProperty({ example: "Andreea", maxLength: 120, type: String })
  @IsString({ message: "Le prénom doit être une chaîne de caractères." })
  @IsNotEmpty({ message: "Le prénom est obligatoire." })
  @MaxLength(120, { message: "Le prénom est trop long." })
  public readonly firstName!: string;

  @ApiProperty({ example: "Rauta", maxLength: 120, type: String })
  @IsString({ message: "Le nom doit être une chaîne de caractères." })
  @IsNotEmpty({ message: "Le nom est obligatoire." })
  @MaxLength(120, { message: "Le nom est trop long." })
  public readonly lastName!: string;

  @ApiPropertyOptional({ example: "+33123456789", maxLength: 40, type: String })
  @IsOptional()
  @IsString({ message: "Le téléphone doit être une chaîne de caractères." })
  @MaxLength(40, { message: "Le téléphone est trop long." })
  public readonly phone?: string;
}

export class LoginRequestDto {
  @ApiProperty({ example: "andreea@smartsite.fr", maxLength: 320, type: String })
  @IsEmail({}, { message: "L'email doit être valide." })
  @MaxLength(320, { message: "L'email est trop long." })
  public readonly email!: string;

  @ApiProperty({
    example: "Password123!",
    maxLength: passwordMaxLength,
    type: String,
  })
  @IsString({ message: "Le mot de passe doit être une chaîne de caractères." })
  @IsNotEmpty({ message: "Le mot de passe est obligatoire." })
  @MaxLength(passwordMaxLength, { message: "Le mot de passe est trop long." })
  public readonly password!: string;
}

export class RegisteredOrganizationDto {
  @ApiProperty({ example: "3f66f364-24d1-4d84-bd8a-54de605cb281", type: String })
  public readonly id!: string;

  @ApiProperty({ example: "Stern Tech", type: String })
  public readonly name!: string;

  @ApiProperty({ example: "andreea@smartsite.fr", nullable: true, type: String })
  public readonly email!: string | null;

  @ApiProperty({ example: "2026-06-01T10:00:00.000Z", type: String })
  public readonly createdAt!: string;
}

export class RegisteredUserDto {
  @ApiProperty({ example: "72191281-2cb0-4565-9827-753e699706be", type: String })
  public readonly id!: string;

  @ApiProperty({ example: "3f66f364-24d1-4d84-bd8a-54de605cb281", type: String })
  public readonly organizationId!: string;

  @ApiProperty({ example: "andreea@smartsite.fr", type: String })
  public readonly email!: string;

  @ApiProperty({ example: "Andreea", type: String })
  public readonly firstName!: string;

  @ApiProperty({ example: "Rauta", type: String })
  public readonly lastName!: string;

  @ApiProperty({ example: "+33123456789", nullable: true, type: String })
  public readonly phone!: string | null;

  @ApiProperty({ example: "active", type: String })
  public readonly status!: string;

  @ApiProperty({ example: ["administrateur"], isArray: true, type: String })
  public readonly roles!: readonly string[];

  @ApiProperty({ example: "2026-06-01T10:00:00.000Z", type: String })
  public readonly createdAt!: string;
}

export class RegisterResponseDto {
  @ApiProperty({ type: RegisteredUserDto })
  public readonly user!: RegisteredUserDto;

  @ApiProperty({ type: RegisteredOrganizationDto })
  public readonly organization!: RegisteredOrganizationDto;

  @ApiProperty({ example: "Bearer", type: String })
  public readonly tokenType!: "Bearer";

  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", type: String })
  public readonly accessToken!: string;
}

export class LoginResponseDto extends RegisterResponseDto {}
