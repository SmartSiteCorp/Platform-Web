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
  AssignableWorkersResponseDto,
  AssignPhaseWorkersRequestDto,
  PhaseWorkerAssignmentsResponseDto,
  WorkerAssignedTasksResponseDto,
} from "./resource-assignments.dto.js";
import { ResourceAssignmentsService } from "./resource-assignments.service.js";

@ApiBearerAuth()
@ApiTags("Planning")
@Controller("sites")
@UseGuards(JwtAuthGuard)
export class ResourceAssignmentsController {
  public constructor(
    @Inject(ResourceAssignmentsService)
    private readonly resourceAssignmentsService: ResourceAssignmentsService,
  ) {}

  @Post(":siteId/phases/:phaseId/worker-assignments")
  @HttpCode(HttpStatus.CREATED)
  @ApiParam({ name: "siteId", type: String })
  @ApiParam({ name: "phaseId", type: String })
  @ApiBody({ type: AssignPhaseWorkersRequestDto })
  @ApiCreatedResponse({
    description: "Ouvriers assignés à la phase.",
    type: PhaseWorkerAssignmentsResponseDto,
  })
  @ApiBadRequestResponse({ description: "Assignation invalide.", type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({
    description: "Token JWT manquant ou invalide.",
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: "Rôle Chef de chantier ou Administrateur et accès au chantier requis.",
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({ description: "Chantier ou phase introuvable.", type: ApiErrorResponseDto })
  public assignWorkersToPhase(
    @Param("siteId", new ParseUUIDPipe({ version: "4" })) siteId: string,
    @Param("phaseId", new ParseUUIDPipe({ version: "4" })) phaseId: string,
    @Body(createHttpValidationPipe(AssignPhaseWorkersRequestDto))
    request: AssignPhaseWorkersRequestDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<PhaseWorkerAssignmentsResponseDto> {
    return this.resourceAssignmentsService.assignWorkersToPhase(siteId, phaseId, request, req.auth);
  }

  @Get(":siteId/phases/:phaseId/worker-assignments")
  @ApiParam({ name: "siteId", type: String })
  @ApiParam({ name: "phaseId", type: String })
  @ApiOkResponse({
    description: "Ouvriers assignés à la phase.",
    type: PhaseWorkerAssignmentsResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "Token JWT manquant ou invalide.",
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: "Rôle Chef de chantier ou Administrateur et accès au chantier requis.",
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({ description: "Chantier ou phase introuvable.", type: ApiErrorResponseDto })
  public listPhaseWorkerAssignments(
    @Param("siteId", new ParseUUIDPipe({ version: "4" })) siteId: string,
    @Param("phaseId", new ParseUUIDPipe({ version: "4" })) phaseId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<PhaseWorkerAssignmentsResponseDto> {
    return this.resourceAssignmentsService.listPhaseWorkerAssignments(siteId, phaseId, req.auth);
  }

  @Get(":siteId/assignable-workers")
  @ApiParam({ name: "siteId", type: String })
  @ApiOkResponse({
    description: "Ouvriers assignables au chantier.",
    type: AssignableWorkersResponseDto,
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
  public listAssignableWorkers(
    @Param("siteId", new ParseUUIDPipe({ version: "4" })) siteId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<AssignableWorkersResponseDto> {
    return this.resourceAssignmentsService.listAssignableWorkers(siteId, req.auth);
  }

  @Get(":siteId/my-tasks")
  @ApiParam({ name: "siteId", type: String })
  @ApiOkResponse({
    description: "Tâches visibles par l'ouvrier connecté.",
    type: WorkerAssignedTasksResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "Token JWT manquant ou invalide.",
    type: ApiErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: "Rôle Ouvrier et accès au chantier requis.",
    type: ApiErrorResponseDto,
  })
  @ApiNotFoundResponse({ description: "Chantier introuvable.", type: ApiErrorResponseDto })
  public listMyAssignedTasks(
    @Param("siteId", new ParseUUIDPipe({ version: "4" })) siteId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<WorkerAssignedTasksResponseDto> {
    return this.resourceAssignmentsService.listMyAssignedTasks(siteId, req.auth);
  }
}
