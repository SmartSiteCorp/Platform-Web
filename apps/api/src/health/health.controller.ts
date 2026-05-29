import { Controller, Get, Inject } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";

import { HealthService } from "./health.service.js";
import { HealthResponseDto } from "./health.dto.js";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  public constructor(@Inject(HealthService) private readonly healthService: HealthService) {}

  @Get()
  @ApiOkResponse({ type: HealthResponseDto })
  public getHealth(): HealthResponseDto {
    return this.healthService.getHealth();
  }
}
