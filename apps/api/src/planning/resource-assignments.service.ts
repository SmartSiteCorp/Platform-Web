import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import type { AccessTokenPayload } from "../auth/auth.types.js";
import { OrganizationsService } from "../organizations/organizations.service.js";
import type {
  AssignableWorkersResponseDto,
  AssignPhaseWorkersRequestDto,
  PhaseWorkerAssignmentsResponseDto,
  WorkerAssignedTasksResponseDto,
} from "./resource-assignments.dto.js";
import { ResourceAssignmentsRepository } from "./resource-assignments.repository.js";
import {
  resourceAssignmentManagementRoleCodes,
  resourceAssignmentWorkerRoleCodes,
  type AssignPhaseWorkersInput,
  type ResourceAssignmentsRepositoryPort,
} from "./resource-assignments.types.js";

@Injectable()
export class ResourceAssignmentsService {
  public constructor(
    @Inject(ResourceAssignmentsRepository)
    private readonly resourceAssignmentsRepository: ResourceAssignmentsRepositoryPort,
    @Inject(OrganizationsService) private readonly organizationsService: OrganizationsService,
  ) {}

  public async assignWorkersToPhase(
    siteId: string,
    phaseId: string,
    request: AssignPhaseWorkersRequestDto,
    user: AccessTokenPayload,
  ): Promise<PhaseWorkerAssignmentsResponseDto> {
    await this.assertCanManageResources(siteId, user);
    await this.assertPhaseInSite(siteId, phaseId);

    const workerUserIds = this.normalizeWorkerUserIds(request.workerUserIds);
    await this.assertWorkersAssignable(siteId, user.organizationId, workerUserIds);

    const input: AssignPhaseWorkersInput = {
      assignedBy: user.sub,
      organizationId: user.organizationId,
      phaseId,
      siteId,
      workerUserIds,
    };
    const assignments = await this.resourceAssignmentsRepository.assignWorkersToPhase(input);

    return { assignments, phaseId, siteId };
  }

  public async listPhaseWorkerAssignments(
    siteId: string,
    phaseId: string,
    user: AccessTokenPayload,
  ): Promise<PhaseWorkerAssignmentsResponseDto> {
    await this.assertCanManageResources(siteId, user);
    await this.assertPhaseInSite(siteId, phaseId);

    const assignments = await this.resourceAssignmentsRepository.listPhaseWorkerAssignments(
      siteId,
      phaseId,
    );

    return { assignments, phaseId, siteId };
  }

  public async listAssignableWorkers(
    siteId: string,
    user: AccessTokenPayload,
  ): Promise<AssignableWorkersResponseDto> {
    await this.assertCanManageResources(siteId, user);

    const workers = await this.resourceAssignmentsRepository.listAssignableWorkers(
      siteId,
      user.organizationId,
    );

    return { siteId, workers };
  }

  public async listMyAssignedTasks(
    siteId: string,
    user: AccessTokenPayload,
  ): Promise<WorkerAssignedTasksResponseDto> {
    await this.organizationsService.assertUserHasAnyRole(
      user.organizationId,
      user,
      resourceAssignmentWorkerRoleCodes,
    );
    await this.assertSiteInOrganization(siteId, user.organizationId);
    await this.assertUserHasSiteRole(siteId, user.sub, resourceAssignmentWorkerRoleCodes);

    const tasks = await this.resourceAssignmentsRepository.listWorkerAssignedTasks(
      siteId,
      user.sub,
    );

    return { siteId, tasks, workerUserId: user.sub };
  }

  private async assertCanManageResources(siteId: string, user: AccessTokenPayload): Promise<void> {
    await this.organizationsService.assertUserHasAnyRole(
      user.organizationId,
      user,
      resourceAssignmentManagementRoleCodes,
    );
    await this.assertSiteInOrganization(siteId, user.organizationId);
    await this.assertUserHasSiteRole(siteId, user.sub, resourceAssignmentManagementRoleCodes);
  }

  private async assertSiteInOrganization(siteId: string, organizationId: string): Promise<void> {
    const exists = await this.resourceAssignmentsRepository.siteExistsInOrganization(
      siteId,
      organizationId,
    );

    if (!exists) {
      throw new NotFoundException(["Le chantier est introuvable."]);
    }
  }

  private async assertPhaseInSite(siteId: string, phaseId: string): Promise<void> {
    const exists = await this.resourceAssignmentsRepository.phaseExistsInSite(siteId, phaseId);

    if (!exists) {
      throw new NotFoundException(["La phase est introuvable."]);
    }
  }

  private async assertUserHasSiteRole(
    siteId: string,
    userId: string,
    roleCodes: readonly string[],
  ): Promise<void> {
    const hasSiteRole = await this.resourceAssignmentsRepository.userHasSiteRole(
      siteId,
      userId,
      roleCodes,
    );

    if (!hasSiteRole) {
      throw new ForbiddenException(["Vous n'avez pas accès à ce chantier."]);
    }
  }

  private normalizeWorkerUserIds(workerUserIds: readonly string[]): readonly string[] {
    const uniqueWorkerUserIds = [...new Set(workerUserIds)];

    if (uniqueWorkerUserIds.length === 0) {
      throw new BadRequestException(["Au moins un ouvrier doit être sélectionné."]);
    }

    return uniqueWorkerUserIds;
  }

  private async assertWorkersAssignable(
    siteId: string,
    organizationId: string,
    workerUserIds: readonly string[],
  ): Promise<void> {
    const assignableWorkerIds = await this.resourceAssignmentsRepository.findAssignableWorkerIds(
      siteId,
      organizationId,
      workerUserIds,
    );
    const assignableWorkerIdSet = new Set(assignableWorkerIds);
    const allWorkersAssignable = workerUserIds.every((workerUserId) =>
      assignableWorkerIdSet.has(workerUserId),
    );

    if (!allWorkersAssignable) {
      throw new BadRequestException([
        "Chaque ouvrier assigné doit être actif, appartenir à l'organisation et au chantier.",
      ]);
    }
  }
}
