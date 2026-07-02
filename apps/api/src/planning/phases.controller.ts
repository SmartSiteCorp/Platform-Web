import {
  Body,
  Controller,
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
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { createHttpValidationPipe } from "../app-http.js";
import type { AuthenticatedRequest } from "../auth/authenticated-request.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { ApiErrorResponseDto } from "../shared/http/api-error-response.dto.js";
import { CreatePhaseRequestDto, PhaseResponseDto } from "./phases.dto.js";
import { PhasesService } from "./phases.service.js";

@ApiBearerAuth()
@ApiTags("Planning")
@Controller("sites")
@UseGuards(JwtAuthGuard)
export class PhasesController {
  public constructor(@Inject(PhasesService) private readonly phasesService: PhasesService) {}

  @Post(":siteId/phases")
  @HttpCode(HttpStatus.CREATED)
  @ApiParam({ name: "siteId", type: String })
  @ApiBody({ type: CreatePhaseRequestDto })
  @ApiCreatedResponse({ description: "Phase créée avec succès.", type: PhaseResponseDto })
  @ApiBadRequestResponse({ description: "Données phase invalides.", type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({
    description: "Token JWT manquant ou invalide.",
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: "Rôle Chef de chantier ou Administrateur et accès au chantier requis.",
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({ description: "Chantier introuvable.", type: ApiErrorResponseDto })
  public createPhase(
    @Param("siteId", new ParseUUIDPipe({ version: "4" })) siteId: string,
    @Body(createHttpValidationPipe(CreatePhaseRequestDto)) request: CreatePhaseRequestDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<PhaseResponseDto> {
    return this.phasesService.createPhase(siteId, request, req.auth);
  }
}
