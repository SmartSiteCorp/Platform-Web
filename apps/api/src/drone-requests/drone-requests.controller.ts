import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { createHttpValidationPipe } from "../app-http.js";
import type { AuthenticatedRequest } from "../auth/authenticated-request.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { ApiErrorResponseDto } from "../shared/http/api-error-response.dto.js";
import {
  CreateDroneRequestRequestDto,
  DroneRequestResponseDto,
  DroneRequestsResponseDto,
} from "./drone-requests.dto.js";
import { DroneRequestsService } from "./drone-requests.service.js";

@ApiBearerAuth()
@ApiTags("Partenaires")
@Controller("sites")
@UseGuards(JwtAuthGuard)
export class DroneRequestsController {
  public constructor(
    @Inject(DroneRequestsService) private readonly droneRequestsService: DroneRequestsService,
  ) {}

  @Post(":siteId/drone-requests")
  @HttpCode(HttpStatus.CREATED)
  @ApiParam({ name: "siteId", type: String })
  @ApiBody({ type: CreateDroneRequestRequestDto })
  @ApiCreatedResponse({
    description: "Demande de droniste créée avec succès.",
    type: DroneRequestResponseDto,
  })
  @ApiBadRequestResponse({
    description: "Données de la demande invalides.",
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "Token JWT manquant ou invalide.",
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: "Rôle Chef de chantier ou Administrateur et accès au chantier requis.",
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({ description: "Chantier introuvable.", type: ApiErrorResponseDto })
  public createDroneRequest(
    @Param("siteId", new ParseUUIDPipe({ version: "4" })) siteId: string,
    @Body(createHttpValidationPipe(CreateDroneRequestRequestDto))
    request: CreateDroneRequestRequestDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<DroneRequestResponseDto> {
    return this.droneRequestsService.createDroneRequest(siteId, request, req.auth);
  }

  @Get(":siteId/drone-requests")
  @ApiParam({ name: "siteId", type: String })
  @ApiOkResponse({
    description: "Demandes de droniste du chantier.",
    type: DroneRequestsResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "Token JWT manquant ou invalide.",
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: "Rôle Chef de chantier ou Administrateur et accès au chantier requis.",
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({ description: "Chantier introuvable.", type: ApiErrorResponseDto })
  public listDroneRequests(
    @Param("siteId", new ParseUUIDPipe({ version: "4" })) siteId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<DroneRequestsResponseDto> {
    return this.droneRequestsService.listDroneRequests(siteId, req.auth);
  }
}
