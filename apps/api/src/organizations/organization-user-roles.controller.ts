import {
  Body,
  Controller,
  Delete,
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
  AddOrganizationUserRoleRequestDto,
  OrganizationUserRolesResponseDto,
} from "./organization-user-roles.dto.js";
import { OrganizationUserRolesService } from "./organization-user-roles.service.js";

@ApiBearerAuth()
@ApiTags("Organization user roles")
@Controller("organizations/:organizationId/users/:userId/roles")
@UseGuards(JwtAuthGuard)
export class OrganizationUserRolesController {
  public constructor(
    @Inject(OrganizationUserRolesService)
    private readonly userRolesService: OrganizationUserRolesService,
  ) {}

  @Get()
  @ApiParam({ name: "organizationId", type: String })
  @ApiParam({ name: "userId", type: String })
  @ApiOkResponse({ type: OrganizationUserRolesResponseDto })
  @ApiUnauthorizedResponse({
    description: "Token JWT manquant ou invalide.",
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({ description: "Accès organisation interdit.", type: ApiErrorResponseDto })
  @ApiNotFoundResponse({
    description: "Utilisateur organisation introuvable.",
    type: ApiErrorResponseDto,
  })
  public getUserRoles(
    @Param("organizationId", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Param("userId", new ParseUUIDPipe({ version: "4" })) userId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<OrganizationUserRolesResponseDto> {
    return this.userRolesService.getUserRoles(organizationId, userId, request.auth);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: "organizationId", type: String })
  @ApiParam({ name: "userId", type: String })
  @ApiBody({ type: AddOrganizationUserRoleRequestDto })
  @ApiOkResponse({ type: OrganizationUserRolesResponseDto })
  @ApiBadRequestResponse({ description: "Rôle invalide.", type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({
    description: "Token JWT manquant ou invalide.",
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({ description: "Accès organisation interdit.", type: ApiErrorResponseDto })
  @ApiNotFoundResponse({
    description: "Utilisateur organisation introuvable.",
    type: ApiErrorResponseDto,
  })
  public addUserRole(
    @Param("organizationId", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Param("userId", new ParseUUIDPipe({ version: "4" })) userId: string,
    @Body(createHttpValidationPipe(AddOrganizationUserRoleRequestDto))
    request: AddOrganizationUserRoleRequestDto,
    @Req() authenticatedRequest: AuthenticatedRequest,
  ): Promise<OrganizationUserRolesResponseDto> {
    return this.userRolesService.addUserRole(
      organizationId,
      userId,
      request,
      authenticatedRequest.auth,
    );
  }

  @Delete(":roleCode")
  @ApiParam({ name: "organizationId", type: String })
  @ApiParam({ name: "userId", type: String })
  @ApiParam({ name: "roleCode", type: String })
  @ApiOkResponse({ type: OrganizationUserRolesResponseDto })
  @ApiBadRequestResponse({ description: "Rôle invalide.", type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({
    description: "Token JWT manquant ou invalide.",
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({ description: "Accès organisation interdit.", type: ApiErrorResponseDto })
  @ApiNotFoundResponse({
    description: "Utilisateur ou rôle introuvable.",
    type: ApiErrorResponseDto,
  })
  public removeUserRole(
    @Param("organizationId", new ParseUUIDPipe({ version: "4" })) organizationId: string,
    @Param("userId", new ParseUUIDPipe({ version: "4" })) userId: string,
    @Param("roleCode") roleCode: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<OrganizationUserRolesResponseDto> {
    return this.userRolesService.removeUserRole(organizationId, userId, roleCode, request.auth);
  }
}
