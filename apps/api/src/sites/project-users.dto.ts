import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class AddProjectUserRequestDto {
  @ApiProperty({
    type: String,
    format: "uuid",
    description: "Utilisateur de la même organisation à associer.",
  })
  @IsUUID()
  public userId!: string;
}

export class ProjectUserResponseDto {
  @ApiProperty({ type: String, format: "uuid" })
  public projectId!: string;

  @ApiProperty({ type: String, format: "uuid" })
  public userId!: string;

  @ApiProperty({ type: String })
  public firstName!: string;

  @ApiProperty({ type: String })
  public lastName!: string;

  @ApiProperty({ type: [String], description: "Rôles effectifs de l'utilisateur sur le chantier." })
  public roleCodes!: string[];
}
