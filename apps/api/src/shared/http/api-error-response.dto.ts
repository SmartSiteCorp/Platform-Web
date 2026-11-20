import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ApiErrorResponseDto {
  @ApiProperty({ example: 400, type: Number })
  public readonly statusCode!: number;

  @ApiProperty({
    example: ["Le nom d'entreprise est obligatoire.", "L'email doit être valide."],
    isArray: true,
    type: String,
  })
  public readonly message!: readonly string[];

  @ApiPropertyOptional({ example: "Bad Request", type: String })
  public readonly error?: string;
}
