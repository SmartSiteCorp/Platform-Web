import { Inject, Injectable } from "@nestjs/common";

import type { AccessTokenPayload } from "../auth/auth.types.js";
import { OrganizationsService } from "../organizations/organizations.service.js";
import type { SiteResponseDto } from "./sites.dto.js";
import { CreateSiteRequestDto } from "./sites.dto.js";
import { SitesRepository } from "./sites.repository.js";
import type { CreateSiteInput, SitesRepositoryPort } from "./sites.types.js";

const siteManagementRoleCodes = ["chef_chantier", "administrateur"] as const;

@Injectable()
export class SitesService {
  public constructor(
    @Inject(SitesRepository) private readonly sitesRepository: SitesRepositoryPort,
    @Inject(OrganizationsService) private readonly organizationsService: OrganizationsService,
  ) {}

  public async createSite(
    request: CreateSiteRequestDto,
    user: AccessTokenPayload,
  ): Promise<SiteResponseDto> {
    await this.organizationsService.assertUserHasAnyRole(
      user.organizationId,
      user,
      siteManagementRoleCodes,
    );

    const input: CreateSiteInput = {
      address: request.address?.trim() || null,
      createdBy: user.sub,
      estimatedDurationDays: request.estimatedDurationDays ?? null,
      name: request.name.trim(),
      organizationId: user.organizationId,
      startDate: request.startDate ?? null,
    };

    return this.sitesRepository.createSite(input);
  }
}
