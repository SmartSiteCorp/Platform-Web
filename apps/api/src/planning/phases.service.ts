import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import type { AccessTokenPayload } from "../auth/auth.types.js";
import { OrganizationsService } from "../organizations/organizations.service.js";
import type { CreatePhaseRequestDto, PhaseResponseDto } from "./phases.dto.js";
import { PhasesRepository } from "./phases.repository.js";
import type { CreatePhaseInput, PhasesRepositoryPort } from "./phases.types.js";

const phaseManagementRoleCodes = ["chef_chantier", "administrateur"] as const;

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

    const input: CreatePhaseInput = {
      description: request.description?.trim() || null,
      estimatedDurationDays: request.estimatedDurationDays ?? null,
      name: request.name.trim(),
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
}
