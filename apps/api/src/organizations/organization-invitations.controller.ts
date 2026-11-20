import {
  Body,
  Controller,
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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { createHttpValidationPipe } from "../app-http.js";
import type { AuthenticatedRequest } from "../auth/authenticated-request.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { ApiErrorResponseDto } from "../shared/http/api-error-response.dto.js";
import {
  AcceptOrganizationInvitationRequestDto,
  AcceptOrganizationInvitationResponseDto,
  CreateOrganizationInvitationRequestDto,
  OrganizationInvitationResponseDto,
} from "./organization-invitations.dto.js";
import { OrganizationInvitationsService } from "./organization-invitations.service.js";

@ApiTags("Organizations")
@Controller("organizations")
export class OrganizationInvitationsController {
  public constructor(
    @Inject(OrganizationInvitationsService)
    private readonly organizationInvitationsService: OrganizationInvitationsService,
  ) {}

  @Post(":id/invitations")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: CreateOrganizationInvitationRequestDto })
  @ApiCreatedResponse({ type: OrganizationInvitationResponseDto })
  @ApiBadRequestResponse({
    description: "Invitation invalide.",
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "Token JWT manquant ou invalide.",
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({ description: "Accès organisation interdit.", type: ApiErrorResponseDto })
  @ApiConflictResponse({ description: "Invitation impossible.", type: ApiErrorResponseDto })
  public createInvitation(
    @Param("id", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Body(createHttpValidationPipe(CreateOrganizationInvitationRequestDto))
    request: CreateOrganizationInvitationRequestDto,
    @Req() authenticatedRequest: AuthenticatedRequest,
  ): Promise<OrganizationInvitationResponseDto> {
    return this.organizationInvitationsService.createInvitation(
      organizationId,
      request,
      authenticatedRequest.auth,
    );
  }

  @Post("invitations/accept")
  @ApiBody({ type: AcceptOrganizationInvitationRequestDto })
  @ApiCreatedResponse({ type: AcceptOrganizationInvitationResponseDto })
  @ApiBadRequestResponse({
    description: "Acceptation d'invitation invalide.",
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "Invitation invalide.",
    type: ApiErrorResponseDto,
  })
  @ApiConflictResponse({
    description: "Acceptation d'invitation impossible.",
    type: ApiErrorResponseDto,
  })
  public acceptInvitation(
    @Body(createHttpValidationPipe(AcceptOrganizationInvitationRequestDto))
    request: AcceptOrganizationInvitationRequestDto,
  ): Promise<AcceptOrganizationInvitationResponseDto> {
    return this.organizationInvitationsService.acceptInvitation(request);
  }
}
