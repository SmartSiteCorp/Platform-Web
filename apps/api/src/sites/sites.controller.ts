import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
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
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { createHttpValidationPipe } from "../app-http.js";
import type { AuthenticatedRequest } from "../auth/authenticated-request.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { ApiErrorResponseDto } from "../shared/http/api-error-response.dto.js";
import { CreateSiteRequestDto, SiteResponseDto } from "./sites.dto.js";
import { SitesService } from "./sites.service.js";

@ApiBearerAuth()
@ApiTags("Sites")
@Controller("sites")
@UseGuards(JwtAuthGuard)
export class SitesController {
  public constructor(@Inject(SitesService) private readonly sitesService: SitesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({ type: CreateSiteRequestDto })
  @ApiCreatedResponse({ description: "Chantier créé avec succès.", type: SiteResponseDto })
  @ApiBadRequestResponse({
    description: "Données chantier invalides.",
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "Token JWT manquant ou invalide.",
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: "Rôle Chef de chantier ou Administrateur requis.",
    type: ApiErrorResponseDto,
  })
  public createSite(
    @Body(createHttpValidationPipe(CreateSiteRequestDto)) request: CreateSiteRequestDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<SiteResponseDto> {
    return this.sitesService.createSite(request, req.auth);
  }
}
