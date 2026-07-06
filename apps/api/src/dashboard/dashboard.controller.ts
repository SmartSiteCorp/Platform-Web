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
import {
  ArchitectDashboardQueryDto,
  ArchitectDashboardResponseDto,
} from "./architect-dashboard.dto.js";
import { ArchitectDashboardService } from "./architect-dashboard.service.js";
import { SiteManagerDashboardQueryDto, SiteManagerDashboardResponseDto } from "./dashboard.dto.js";
import { DashboardService } from "./dashboard.service.js";
import {
  DroneOperatorDashboardQueryDto,
  DroneOperatorDashboardResponseDto,
} from "./drone-operator-dashboard.dto.js";
import { DroneOperatorDashboardService } from "./drone-operator-dashboard.service.js";

@ApiBearerAuth()
@ApiTags("Dashboard")
@Controller("dashboard")
@UseGuards(JwtAuthGuard)
export class DashboardController {
  public constructor(
    @Inject(ArchitectDashboardService)
    private readonly architectDashboardService: ArchitectDashboardService,
    @Inject(DashboardService) private readonly dashboardService: DashboardService,
    @Inject(DroneOperatorDashboardService)
    private readonly droneOperatorDashboardService: DroneOperatorDashboardService,
  ) {}

  @Get("architect")
  @ApiOkResponse({
    description: "Agrégation du dashboard architecte.",
    type: ArchitectDashboardResponseDto,
  })
  @ApiQuery({
    description: "Filtre optionnel sur un chantier accessible à l'architecte.",
    name: "siteId",
    required: false,
    type: String,
  })
  @ApiBadRequestResponse({
    description: "Filtre dashboard architecte invalide.",
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "Token JWT manquant ou invalide.",
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: "Rôle Architecte ou Administrateur et accès chantier requis.",
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({ description: "Chantier introuvable.", type: ApiErrorResponseDto })
  public getArchitectDashboard(
    @Query(createHttpValidationPipe(ArchitectDashboardQueryDto))
    query: ArchitectDashboardQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ArchitectDashboardResponseDto> {
    return this.architectDashboardService.getArchitectDashboard(query, req.auth);
  }

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

  @Get("drone-operator")
  @ApiOkResponse({
    description: "Agrégation du dashboard droniste.",
    type: DroneOperatorDashboardResponseDto,
  })
  @ApiQuery({
    description: "Filtre optionnel sur un chantier accessible au droniste.",
    name: "siteId",
    required: false,
    type: String,
  })
  @ApiBadRequestResponse({
    description: "Filtre dashboard droniste invalide.",
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "Token JWT manquant ou invalide.",
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: "Rôle Droniste ou Administrateur et accès chantier requis.",
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({ description: "Chantier introuvable.", type: ApiErrorResponseDto })
  public getDroneOperatorDashboard(
    @Query(createHttpValidationPipe(DroneOperatorDashboardQueryDto))
    query: DroneOperatorDashboardQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<DroneOperatorDashboardResponseDto> {
    return this.droneOperatorDashboardService.getDroneOperatorDashboard(query, req.auth);
  }
}
