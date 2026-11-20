import {
  Body,
  Controller,
  Get,
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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { createHttpValidationPipe } from "../app-http.js";
import type { AuthenticatedRequest } from "../auth/authenticated-request.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { ApiErrorResponseDto } from "../shared/http/api-error-response.dto.js";
import { AddProjectUserRequestDto, ProjectUserResponseDto } from "./project-users.dto.js";
import { ProjectUsersService } from "./project-users.service.js";

@ApiBearerAuth()
@ApiTags("Projects")
@Controller("projects/:id/users")
@UseGuards(JwtAuthGuard)
@ApiParam({
  name: "id",
  type: String,
  format: "uuid",
  description: "Identifiant du chantier (sites.id).",
})
@ApiBadRequestResponse({ type: ApiErrorResponseDto })
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
@ApiForbiddenResponse({ type: ApiErrorResponseDto })
@ApiNotFoundResponse({ type: ApiErrorResponseDto })
export class ProjectUsersController {
  public constructor(@Inject(ProjectUsersService) private readonly service: ProjectUsersService) {}

  @Post()
  @ApiOperation({
    summary:
      "Associer un intervenant avec ses rôles actuels. Chef ou administrateur du chantier requis.",
  })
  @ApiBody({ type: AddProjectUserRequestDto })
  @ApiCreatedResponse({ type: ProjectUserResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto })
  public add(
    @Param("id", new ParseUUIDPipe()) projectId: string,
    @Body(createHttpValidationPipe(AddProjectUserRequestDto)) body: AddProjectUserRequestDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ProjectUserResponseDto> {
    return this.service.add(projectId, body.userId, request.auth);
  }

  @Get()
  @ApiOperation({ summary: "Lister les intervenants. Membre du chantier requis." })
  @ApiOkResponse({ type: ProjectUserResponseDto, isArray: true })
  public list(
    @Param("id", new ParseUUIDPipe()) projectId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ProjectUserResponseDto[]> {
    return this.service.list(projectId, request.auth);
  }
}
