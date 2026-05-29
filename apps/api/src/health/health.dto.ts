import { ApiProperty } from "@nestjs/swagger";

export class HealthResponseDto {
  @ApiProperty({ example: "ok", type: String })
  public readonly status!: "ok";

  @ApiProperty({ example: "SmartSite API is running.", type: String })
  public readonly message!: string;

  @ApiProperty({ example: "2026-05-28T15:00:00.000Z", type: String })
  public readonly timestamp!: string;
}
