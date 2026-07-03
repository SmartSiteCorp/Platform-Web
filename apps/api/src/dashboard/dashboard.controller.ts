import { Controller, Get, Inject, Query, Req, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { createHttpValidationPipe } from "../app-http.js";
import type { AuthenticatedRequest } from "../auth/authenticated-request.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { ApiErrorResponseDto } from "../shared/http/api-error-response.dto.js";
import { SiteManagerDashboardQueryDto, SiteManagerDashboardResponseDto } from "./dashboard.dto.js";
import { DashboardService } from "./dashboard.service.js";

@ApiBearerAuth()
@ApiTags("Dashboard")
@Controller("dashboard")
@UseGuards(JwtAuthGuard)
export class DashboardController {
  public constructor(
    @Inject(DashboardService) private readonly dashboardService: DashboardService,
  ) {}

  @Get("site-manager")
  @ApiOkResponse({
    description: "Agrégation du dashboard chef de chantier.",
    type: SiteManagerDashboardResponseDto,
  })
  @ApiQuery({
    description: "Filtre optionnel sur un chantier accessible au chef de chantier.",
    name: "siteId",
    required: false,
    type: String,
  })
  @ApiBadRequestResponse({
    description: "Filtre dashboard invalide.",
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "Token JWT manquant ou invalide.",
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: "Rôle Chef de chantier ou Administrateur et accès chantier requis.",
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({ description: "Chantier introuvable.", type: ApiErrorResponseDto })
  public getSiteManagerDashboard(
    @Query(createHttpValidationPipe(SiteManagerDashboardQueryDto))
    query: SiteManagerDashboardQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<SiteManagerDashboardResponseDto> {
    return this.dashboardService.getSiteManagerDashboard(query, req.auth);
  }
}
