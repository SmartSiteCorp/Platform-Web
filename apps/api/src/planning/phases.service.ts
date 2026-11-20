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
  CreatePhaseRequestDto,
  PhaseResponseDto,
  UpdatePhaseRequestDto,
} from "./phases.dto.js";
import { PhasesRepository } from "./phases.repository.js";
import {
  phaseManagementRoleCodes,
  type CreatePhaseInput,
  type PhasesRepositoryPort,
  type UpdatePhaseField,
  type UpdatePhaseInput,
} from "./phases.types.js";

@Injectable()
export class PhasesService {
  public constructor(
    @Inject(PhasesRepository) private readonly phasesRepository: PhasesRepositoryPort,
    @Inject(OrganizationsService) private readonly organizationsService: OrganizationsService,
  ) {}

  public async createPhase(
    siteId: string,
    request: CreatePhaseRequestDto,
    user: AccessTokenPayload,
  ): Promise<PhaseResponseDto> {
    await this.organizationsService.assertUserHasAnyRole(
      user.organizationId,
      user,
      phaseManagementRoleCodes,
    );

    await this.assertSiteInOrganization(siteId, user.organizationId);
    await this.assertUserCanManageSitePhases(siteId, user.sub);

    const input: CreatePhaseInput = {
      createdBy: user.sub,
      description: request.description?.trim() || null,
      estimatedDurationDays: request.estimatedDurationDays ?? null,
      name: this.normalizePhaseName(request.name),
      organizationId: user.organizationId,
      siteId,
      startDate: request.startDate ?? null,
    };

    return this.phasesRepository.createPhase(input);
  }

  public async updatePhase(
    siteId: string,
    phaseId: string,
    request: UpdatePhaseRequestDto,
    user: AccessTokenPayload,
  ): Promise<PhaseResponseDto> {
    await this.organizationsService.assertUserHasAnyRole(
      user.organizationId,
      user,
      phaseManagementRoleCodes,
    );

    await this.assertSiteInOrganization(siteId, user.organizationId);
    await this.assertUserCanManageSitePhases(siteId, user.sub);

    const input = this.buildUpdatePhaseInput(siteId, phaseId, request, user);
    const phase = await this.phasesRepository.updatePhase(input);

    if (!phase) {
      throw new NotFoundException(["La phase est introuvable."]);
    }

    return phase;
  }

  private buildUpdatePhaseInput(
    siteId: string,
    phaseId: string,
    request: UpdatePhaseRequestDto,
    user: AccessTokenPayload,
  ): UpdatePhaseInput {
    const changedFields: UpdatePhaseField[] = [];
    const updatedValues: {
      description?: string | null;
      estimatedDurationDays?: number | null;
      name?: string;
      startDate?: string | null;
    } = {};

    if (request.name !== undefined) {
      changedFields.push("name");
      updatedValues.name = this.normalizePhaseName(request.name);
    }

    if (request.description !== undefined) {
      changedFields.push("description");
      updatedValues.description = request.description?.trim() || null;
    }

    if (request.startDate !== undefined) {
      changedFields.push("startDate");
      updatedValues.startDate = request.startDate ?? null;
    }

    if (request.estimatedDurationDays !== undefined) {
      changedFields.push("estimatedDurationDays");
      updatedValues.estimatedDurationDays = request.estimatedDurationDays ?? null;
    }

    if (changedFields.length === 0) {
      throw new BadRequestException(["Aucune modification de phase n'est fournie."]);
    }

    return {
      changedFields,
      organizationId: user.organizationId,
      phaseId,
      siteId,
      updatedBy: user.sub,
      ...updatedValues,
    };
  }

  private normalizePhaseName(name: string): string {
    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      throw new BadRequestException(["Le nom de la phase est obligatoire."]);
    }

    return trimmedName;
  }

  private async assertSiteInOrganization(siteId: string, organizationId: string): Promise<void> {
    const exists = await this.phasesRepository.siteExistsInOrganization(siteId, organizationId);

    if (!exists) {
      throw new NotFoundException(["Le chantier est introuvable."]);
    }
  }

  private async assertUserCanManageSitePhases(siteId: string, userId: string): Promise<void> {
    const hasSiteAccess = await this.phasesRepository.userCanManageSitePhases(
      siteId,
      userId,
      phaseManagementRoleCodes,
    );

    if (!hasSiteAccess) {
      throw new ForbiddenException(["Vous n'avez pas accès à ce chantier."]);
    }
  }
}
