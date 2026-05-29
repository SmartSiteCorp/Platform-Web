import { Injectable } from "@nestjs/common";

import { HealthResponseDto } from "./health.dto.js";

@Injectable()
export class HealthService {
  public getHealth(): HealthResponseDto {
    return {
      message: "SmartSite API is running.",
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
