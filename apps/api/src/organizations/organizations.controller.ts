import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import type { AuthenticatedRequest } from "../auth/authenticated-request.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { createHttpValidationPipe } from "../app-http.js";
import { ApiErrorResponseDto } from "../shared/http/api-error-response.dto.js";
import {
  OrganizationResponseDto,
  OrganizationUsersResponseDto,
  UpdateOrganizationRequestDto,
} from "./organizations.dto.js";
import { OrganizationsService } from "./organizations.service.js";

@ApiBearerAuth()
@ApiTags("Organizations")
@Controller("organizations")
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  public constructor(
    @Inject(OrganizationsService) private readonly organizationsService: OrganizationsService,
  ) {}

  @Get(":id")
  @ApiParam({ name: "id", type: String })
  @ApiOkResponse({ type: OrganizationResponseDto })
  @ApiUnauthorizedResponse({
    description: "Token JWT manquant ou invalide.",
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({ description: "Accès organisation interdit.", type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: "Organisation introuvable.", type: ApiErrorResponseDto })
  public getOrganization(
    @Param("id", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.getOrganization(organizationId, request.auth);
  }

  @Get(":id/users")
  @ApiParam({ name: "id", type: String })
  @ApiOkResponse({ type: OrganizationUsersResponseDto })
  @ApiUnauthorizedResponse({
    description: "Token JWT manquant ou invalide.",
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({ description: "Accès organisation interdit.", type: ApiErrorResponseDto })
  public listOrganizationUsers(
    @Param("id", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<OrganizationUsersResponseDto> {
    return this.organizationsService.listOrganizationUsers(organizationId, request.auth);
  }

  @Put(":id")
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateOrganizationRequestDto })
  @ApiOkResponse({ type: OrganizationResponseDto })
  @ApiBadRequestResponse({
    description: "Données organisation invalides.",
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "Token JWT manquant ou invalide.",
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({ description: "Accès organisation interdit.", type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: "Organisation introuvable.", type: ApiErrorResponseDto })
  public updateOrganization(
    @Param("id", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Body(createHttpValidationPipe(UpdateOrganizationRequestDto))
    request: UpdateOrganizationRequestDto,
    @Req() authenticatedRequest: AuthenticatedRequest,
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.updateOrganization(
      organizationId,
      request,
      authenticatedRequest.auth,
    );
  }
}
