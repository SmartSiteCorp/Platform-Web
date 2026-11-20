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
import { ListPartnerRequestsQueryDto, PartnerRequestsResponseDto } from "./partner-requests.dto.js";
import { PartnerRequestsService } from "./partner-requests.service.js";

@ApiBearerAuth()
@ApiTags("Partenaires")
@Controller("partner-requests")
@UseGuards(JwtAuthGuard)
export class PartnerRequestsController {
  public constructor(
    @Inject(PartnerRequestsService) private readonly partnerRequestsService: PartnerRequestsService,
  ) {}

  @Get()
  @ApiOkResponse({
    description: "Liste paginée des demandes de partenaires (architecte et droniste).",
    type: PartnerRequestsResponseDto,
  })
  @ApiQuery({
    description: "Filtre optionnel sur le type de partenaire.",
    enum: ["architect", "drone"],
    name: "partnerType",
    required: false,
  })
  @ApiQuery({
    description: "Filtre optionnel sur un chantier accessible à l'utilisateur.",
    name: "siteId",
    required: false,
    type: String,
  })
  @ApiQuery({
    description: "Numéro de page (défaut 1).",
    name: "page",
    required: false,
    type: Number,
  })
  @ApiQuery({
    description: "Taille de page (défaut 20, max 100).",
    name: "pageSize",
    required: false,
    type: Number,
  })
  @ApiBadRequestResponse({
    description: "Filtre ou pagination invalide.",
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "Token JWT manquant ou invalide.",
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: "Rôle Chef de chantier ou Administrateur, et accès au chantier filtré, requis.",
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: "Le chantier filtré est introuvable.",
    type: ApiErrorResponseDto,
  })
  public listPartnerRequests(
    @Query(createHttpValidationPipe(ListPartnerRequestsQueryDto))
    query: ListPartnerRequestsQueryDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<PartnerRequestsResponseDto> {
    return this.partnerRequestsService.listPartnerRequests(query, req.auth);
  }
}
