import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import type { AccessTokenPayload } from "../auth/auth.types.js";
import { OrganizationsService } from "../organizations/organizations.service.js";
import type { CreatePhaseRequestDto, PhaseResponseDto } from "./phases.dto.js";
import { PhasesRepository } from "./phases.repository.js";
import {
  phaseManagementRoleCodes,
  type CreatePhaseInput,
  type PhasesRepositoryPort,
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
      name: request.name.trim(),
      organizationId: user.organizationId,
      siteId,
      startDate: request.startDate ?? null,
    };

    return this.phasesRepository.createPhase(input);
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
