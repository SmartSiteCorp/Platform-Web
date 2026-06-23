import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export const organizationUserRoleCodeMaxLength = 80;

export class AddOrganizationUserRoleRequestDto {
  @ApiProperty({
    example: "chef_chantier",
    maxLength: organizationUserRoleCodeMaxLength,
    type: String,
  })
  @IsString({ message: "Le rôle doit être une chaîne de caractères." })
  @IsNotEmpty({ message: "Le rôle est obligatoire." })
  @MaxLength(organizationUserRoleCodeMaxLength, { message: "Le code rôle est trop long." })
  public readonly roleCode!: string;
}

export class OrganizationUserRolesResponseDto {
  @ApiProperty({ example: "3f66f364-24d1-4d84-bd8a-54de605cb281", type: String })
  public readonly organizationId!: string;

  @ApiProperty({ example: "8f3de370-2782-4c32-8c3e-92d7f451d7c5", type: String })
  public readonly userId!: string;

  @ApiProperty({ example: ["chef_chantier", "droniste"], isArray: true, type: String })
  public readonly roleCodes!: readonly string[];
}
