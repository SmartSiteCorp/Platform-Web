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
  ArchitectRequestResponseDto,
  ArchitectRequestsResponseDto,
  CreateArchitectRequestRequestDto,
} from "./architect-requests.dto.js";
import { ArchitectRequestsService } from "./architect-requests.service.js";

@ApiBearerAuth()
@ApiTags("Partenaires")
@Controller("sites")
@UseGuards(JwtAuthGuard)
export class ArchitectRequestsController {
  public constructor(
    @Inject(ArchitectRequestsService)
    private readonly architectRequestsService: ArchitectRequestsService,
  ) {}

  @Post(":siteId/architect-requests")
  @HttpCode(HttpStatus.CREATED)
  @ApiParam({ name: "siteId", type: String })
  @ApiBody({ type: CreateArchitectRequestRequestDto })
  @ApiCreatedResponse({
    description: "Demande d'architecte partenaire créée avec succès.",
    type: ArchitectRequestResponseDto,
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
  public createArchitectRequest(
    @Param("siteId", new ParseUUIDPipe({ version: "4" })) siteId: string,
    @Body(createHttpValidationPipe(CreateArchitectRequestRequestDto))
    request: CreateArchitectRequestRequestDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ArchitectRequestResponseDto> {
    return this.architectRequestsService.createArchitectRequest(siteId, request, req.auth);
  }

  @Get(":siteId/architect-requests")
  @ApiParam({ name: "siteId", type: String })
  @ApiOkResponse({
    description: "Demandes d'architecte partenaire du chantier.",
    type: ArchitectRequestsResponseDto,
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
  public listArchitectRequests(
    @Param("siteId", new ParseUUIDPipe({ version: "4" })) siteId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<ArchitectRequestsResponseDto> {
    return this.architectRequestsService.listArchitectRequests(siteId, req.auth);
  }
}
